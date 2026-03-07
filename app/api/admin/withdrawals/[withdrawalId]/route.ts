import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ withdrawalId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-withdrawal-review:${ip}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { action, note } = (await req.json()) as { action?: "APPROVED" | "REJECTED"; note?: string };
  const noteText = note?.trim() || null;

  if (!action || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const delegates = prisma as unknown as {
      walletTransaction?: unknown;
      platformEarning?: unknown;
      platformTreasury?: unknown;
      notification?: {
        create: (args: {
          data: {
            userId: string;
            title: string;
            message: string;
            type: "SUCCESS" | "WARNING";
          };
        }) => Promise<unknown>;
      };
    };

    const { withdrawalId } = await params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    if (action === "REJECTED") {
      const rejected = await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "REJECTED", adminNote: noteText, processedAt: new Date() },
      });

      await writeAuditLog({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: withdrawal.userId,
        action: "WITHDRAWAL_REJECTED",
        details: `withdrawalId=${withdrawal.id}, amount=${withdrawal.amount}, note=${noteText || "-"}`,
      });

      if (delegates.notification) {
        await delegates.notification.create({
          data: {
            userId: withdrawal.userId,
            title: "Withdrawal Rejected",
            message: `Your withdrawal request of INR ${withdrawal.amount} was rejected.${noteText ? ` Note: ${noteText}` : ""}`,
            type: "WARNING",
          },
        });
      }

      return NextResponse.json({
        message: "Withdrawal rejected",
        rejected,
      });
    }

    if (!delegates.walletTransaction) {
      return NextResponse.json(
        {
          error:
            "Wallet transaction system unavailable in current runtime. Restart server and retry approval.",
        },
        { status: 500 }
      );
    }

    const rawRate = Number(process.env.WITHDRAWAL_COMMISSION_RATE ?? 0.02);
    const commissionRate = Number.isFinite(rawRate)
      ? Math.min(Math.max(rawRate, 0), 0.5)
      : 0.02;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: withdrawal.userId },
      });

      if (!user || user.balance < withdrawal.amount) {
        throw new Error("Insufficient balance");
      }

      const feeAmount = Number((withdrawal.amount * commissionRate).toFixed(2));
      const payoutAmount = Number((withdrawal.amount - feeAmount).toFixed(2));

      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          balance: {
            decrement: withdrawal.amount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          type: "DEBIT",
          note: `Withdrawal approved (payout INR ${payoutAmount}, fee INR ${feeAmount})`,
        },
      });

      if (feeAmount > 0 && (!delegates.platformEarning || !delegates.platformTreasury)) {
        throw new Error(
          "Platform commission system unavailable in current runtime. Restart server and retry approval."
        );
      }

      if (delegates.platformEarning && delegates.platformTreasury && feeAmount > 0) {
        await (tx as typeof tx & {
          platformEarning: {
            create: (args: {
              data: {
                amount: number;
                source: string;
              };
            }) => Promise<unknown>;
          };
        }).platformEarning.create({
          data: {
            amount: feeAmount,
            source: `Withdrawal fee - user ${withdrawal.userId}`,
          },
        });

        await (tx as typeof tx & {
          platformTreasury: {
            upsert: (args: {
              where: { id: string };
              update: { balance: { increment: number } };
              create: { id: string; balance: number };
            }) => Promise<unknown>;
          };
        }).platformTreasury.upsert({
          where: { id: "main" },
          update: {
            balance: { increment: feeAmount },
          },
          create: {
            id: "main",
            balance: feeAmount,
          },
        });
      }

      const approved = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "APPROVED", adminNote: noteText, processedAt: new Date() },
      });

      return { approved, feeAmount, payoutAmount };
    });

    if (delegates.notification) {
      await delegates.notification.create({
        data: {
          userId: withdrawal.userId,
          title: "Withdrawal Approved",
          message: `Your withdrawal of INR ${withdrawal.amount} was approved. Payout INR ${result.payoutAmount}, fee INR ${result.feeAmount}.${noteText ? ` Note: ${noteText}` : ""}`,
          type: "SUCCESS",
        },
      });
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: withdrawal.userId,
      action: "WITHDRAWAL_APPROVED",
      details: `withdrawalId=${withdrawal.id}, amount=${withdrawal.amount}, fee=${result.feeAmount}, note=${noteText || "-"}`,
    });

    return NextResponse.json({
      message: "Withdrawal approved",
      result: result.approved,
      payoutAmount: result.payoutAmount,
      feeAmount: result.feeAmount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

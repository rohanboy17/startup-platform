import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-submission-review:${ip}`,
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

  const { action } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(action)) {
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

    const { submissionId } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { task: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    if (action === "REJECTED") {
      const rejected = await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "REJECTED" },
      });

      await writeAuditLog({
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: submission.userId,
        action: "SUBMISSION_REJECTED",
        details: `submissionId=${submission.id}, taskId=${submission.taskId}`,
      });

      if (delegates.notification) {
        await delegates.notification.create({
          data: {
            userId: submission.userId,
            title: "Submission Rejected",
            message: `Your submission for "${submission.task.title}" was rejected.`,
            type: "WARNING",
          },
        });
      }

      return NextResponse.json({ message: "Submission rejected", rejected });
    }

    if (!delegates.walletTransaction || !delegates.platformEarning || !delegates.platformTreasury) {
      return NextResponse.json(
        {
          error:
            "Payment system unavailable in current runtime. Restart server and retry approval.",
        },
        { status: 500 }
      );
    }

    const COMMISSION_RATE = 0.30;

    const result = await prisma.$transaction(async (tx) => {
      if (submission.task.remainingBudget < submission.task.reward) {
        throw new Error("Insufficient task budget");
      }

      const reward = submission.task.reward;
      const commission = reward * COMMISSION_RATE;
      const userAmount = reward - commission;

      await tx.task.update({
        where: { id: submission.taskId },
        data: {
          remainingBudget: {
            decrement: reward,
          },
        },
      });

      await tx.user.update({
        where: { id: submission.userId },
        data: {
          balance: {
            increment: userAmount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: submission.userId,
          amount: userAmount,
          type: "CREDIT",
          note: `Task reward (70%) - ${submission.task.title}`,
        },
      });

      await tx.platformEarning.create({
        data: {
          amount: commission,
          source: `Task commission - ${submission.task.title}`,
        },
      });

      await tx.platformTreasury.upsert({
        where: { id: "main" },
        update: {
          balance: { increment: commission },
        },
        create: {
          id: "main",
          balance: commission,
        },
      });

      return await tx.submission.update({
        where: { id: submission.id },
        data: { status: "APPROVED" },
      });
    });

    if (delegates.notification) {
      await delegates.notification.create({
        data: {
          userId: submission.userId,
          title: "Submission Approved",
          message: `Your submission for "${submission.task.title}" was approved. INR ${
            submission.task.reward - submission.task.reward * COMMISSION_RATE
          } credited to wallet.`,
          type: "SUCCESS",
        },
      });
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: submission.userId,
      action: "SUBMISSION_APPROVED",
      details: `submissionId=${submission.id}, taskId=${submission.taskId}, reward=${submission.task.reward}`,
    });

    return NextResponse.json({
      message: "Submission approved & wallet credited",
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

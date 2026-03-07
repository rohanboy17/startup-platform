import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileTreasuryBalance } from "@/lib/treasury";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const delegates = prisma as unknown as {
    platformPayout?: {
      findUnique: (args: { where: { id: string } }) => Promise<{
        id: string;
        amount: number;
        note: string | null;
        status: "PENDING" | "APPROVED" | "REJECTED";
      } | null>;
      update: (args: {
        where: { id: string };
        data: {
          note?: string | null;
          status: "APPROVED" | "REJECTED";
          processedAt: Date;
        };
      }) => Promise<unknown>;
      create: (args: {
        data: {
          amount: number;
          note: string | null;
          status: "PENDING";
        };
      }) => Promise<unknown>;
    };
    platformTreasury?: unknown;
  };

  if (!delegates.platformPayout || !delegates.platformTreasury) {
    return NextResponse.json(
      { error: "Revenue payout system unavailable. Restart server and retry." },
      { status: 500 }
    );
  }

  const { action, note } = (await req.json()) as {
    action?: "APPROVED" | "REJECTED" | "RETRY";
    note?: string;
  };
  const noteText = note?.trim() || null;
  if (!["APPROVED", "REJECTED", "RETRY"].includes(action || "")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { payoutId } = await params;

  const payout = await delegates.platformPayout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
  }

  if (action !== "RETRY" && payout.status !== "PENDING") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  if (action === "RETRY") {
    if (payout.status !== "REJECTED") {
      return NextResponse.json({ error: "Only rejected payouts can be retried" }, { status: 400 });
    }

    const retry = await delegates.platformPayout.create({
      data: {
        amount: payout.amount,
        note: noteText || `Retry of payout ${payout.id}${payout.note ? ` | ${payout.note}` : ""}`,
        status: "PENDING",
      },
    });

    return NextResponse.json({ message: "Payout retried as new request", payout: retry });
  }

  if (action === "REJECTED") {
    const rejected = await delegates.platformPayout.update({
      where: { id: payoutId },
      data: { status: "REJECTED", processedAt: new Date(), note: noteText || payout.note },
    });

    return NextResponse.json({ message: "Payout rejected", payout: rejected });
  }

  const reconciledBalance = await reconcileTreasuryBalance();
  if (reconciledBalance < payout.amount) {
    return NextResponse.json({ error: "Insufficient treasury balance" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const treasury = await tx.platformTreasury.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main", balance: 0 },
    });

    if (treasury.balance < payout.amount) {
      throw new Error("Insufficient treasury balance");
    }

    await tx.platformTreasury.update({
      where: { id: "main" },
      data: {
        balance: { decrement: payout.amount },
      },
    });

    const approved = await tx.platformPayout.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
        note: noteText || payout.note,
      },
    });

    return approved;
  });

  return NextResponse.json({
    message: "Payout approved",
    payout: result,
  });
}

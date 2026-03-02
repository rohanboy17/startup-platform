import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileTreasuryBalance } from "@/lib/treasury";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const delegates = prisma as unknown as {
    platformTreasury?: {
      upsert: (args: {
        where: { id: string };
        update: object;
        create: { id: string; balance: number };
      }) => Promise<{ balance: number }>;
    };
    platformPayout?: {
      findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<unknown[]>;
    };
  };

  if (!delegates.platformTreasury || !delegates.platformPayout) {
    return NextResponse.json(
      { error: "Revenue payout system unavailable. Restart server and retry." },
      { status: 500 }
    );
  }

  const [reconciledBalance, payouts] = await Promise.all([
    reconcileTreasuryBalance(),
    delegates.platformPayout.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    treasuryBalance: reconciledBalance,
    payouts,
  });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const delegates = prisma as unknown as {
    platformTreasury?: {
      upsert: (args: {
        where: { id: string };
        update: object;
        create: { id: string; balance: number };
      }) => Promise<{ balance: number }>;
    };
    platformPayout?: {
      create: (args: {
        data: {
          amount: number;
          note: string | null;
          status: "PENDING";
        };
      }) => Promise<unknown>;
    };
  };

  if (!delegates.platformTreasury || !delegates.platformPayout) {
    return NextResponse.json(
      { error: "Revenue payout system unavailable. Restart server and retry." },
      { status: 500 }
    );
  }

  const { amount, note } = await req.json();
  const amountNumber = Number(amount);

  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const reconciledBalance = await reconcileTreasuryBalance();
  if (reconciledBalance < amountNumber) {
    return NextResponse.json(
      { error: "Insufficient treasury balance" },
      { status: 400 }
    );
  }

  const payout = await delegates.platformPayout.create({
    data: {
      amount: amountNumber,
      note: typeof note === "string" ? note : null,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    message: "Payout request created",
    payout,
  });
}

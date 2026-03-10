import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const walletTransaction = (prisma as unknown as {
    walletTransaction?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          note: string | null;
          createdAt: Date;
          type: "CREDIT" | "DEBIT";
          amount: number;
        }>
      >;
      aggregate: (args: {
        where: { userId: string; type: "CREDIT" | "DEBIT" };
        _sum: { amount: true };
      }) => Promise<{ _sum: { amount: number | null } }>;
    };
  }).walletTransaction;

  const [user, totalCredits, totalDebits, recentTransactions, pendingWithdrawalAmount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    }),
    walletTransaction?.aggregate({
      where: { userId: session.user.id, type: "CREDIT" },
      _sum: { amount: true },
    }) ?? Promise.resolve({ _sum: { amount: 0 } }),
    walletTransaction?.aggregate({
      where: { userId: session.user.id, type: "DEBIT" },
      _sum: { amount: true },
    }) ?? Promise.resolve({ _sum: { amount: 0 } }),
    walletTransaction?.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }) ?? Promise.resolve([]),
    prisma.withdrawal.aggregate({
      where: { userId: session.user.id, status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    balance: user?.balance ?? 0,
    totals: {
      earned: totalCredits._sum.amount ?? 0,
      withdrawn: totalDebits._sum.amount ?? 0,
      pendingWithdrawal: pendingWithdrawalAmount._sum.amount ?? 0,
    },
    transactions: recentTransactions.map((item) => ({
      id: item.id,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
      type: item.type,
      amount: item.amount,
    })),
  });
}

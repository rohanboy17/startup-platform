import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [user, withdrawals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    balance: user?.balance ?? 0,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      upiId: w.upiId,
      upiName: w.upiName,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
  });
}

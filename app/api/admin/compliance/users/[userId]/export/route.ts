import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;

  const [user, submissions, withdrawals, transactions, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    exportAt: new Date().toISOString(),
    user,
    submissions,
    withdrawals,
    transactions,
    notifications,
  });
}

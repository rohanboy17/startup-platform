import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureReferralCodeForUser, getMonthStart, getReferralSettings } from "@/lib/referrals";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = session.user.id;
  const settings = getReferralSettings();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      coinBalance: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const code = await ensureReferralCodeForUser(prisma, {
    userId,
    name: user.name,
    email: user.email,
  });

  const monthStart = getMonthStart();

  const [invites, recentCoinTransactions, monthlyRedemption] = await Promise.all([
    prisma.referralInvite.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        referred: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      take: 50,
    }),
    prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.coinRedemption.aggregate({
      where: {
        userId,
        status: "APPROVED",
        createdAt: { gte: monthStart },
      },
      _sum: { coinsUsed: true },
    }),
  ]);

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() || "http";
  const host =
    (h.get("x-forwarded-host") || "").split(",")[0].trim() ||
    (h.get("host") || "").split(",")[0].trim();
  const inferredBase = host ? `${proto}://${host}` : "";
  const referralLinkBaseRaw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || inferredBase || "";
  const referralLinkBase = referralLinkBaseRaw.replace(/\/$/, "");

  return NextResponse.json({
    settings,
    summary: {
      coinBalance: user.coinBalance,
      totalInvites: invites.length,
      rewardedInvites: invites.filter((item) => item.status === "REWARDED").length,
      pendingInvites: invites.filter((item) => item.status === "PENDING").length,
      monthlyRedeemedCoins: monthlyRedemption._sum.coinsUsed ?? 0,
    },
    referral: {
      code: code.code,
      link: referralLinkBase ? `${referralLinkBase}/register?ref=${code.code}` : `/register?ref=${code.code}`,
    },
    invites: invites.map((item) => ({
      id: item.id,
      codeUsed: item.codeUsed,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      qualifiedAt: item.qualifiedAt?.toISOString() || null,
      rewardedAt: item.rewardedAt?.toISOString() || null,
      referredUser: {
        id: item.referred.id,
        name: item.referred.name || "New user",
        createdAt: item.referred.createdAt.toISOString(),
      },
    })),
    transactions: recentCoinTransactions.map((item) => ({
      id: item.id,
      amount: item.amount,
      type: item.type,
      source: item.source,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

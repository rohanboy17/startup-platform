import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthStart, getReferralSettings } from "@/lib/referrals";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { coins } = (await req.json()) as { coins?: number };
  const requestedCoins = Number(coins ?? 0);
  const settings = getReferralSettings();

  if (!Number.isInteger(requestedCoins) || requestedCoins <= 0) {
    return NextResponse.json({ error: "Valid coin amount is required" }, { status: 400 });
  }

  if (requestedCoins < settings.redeemMinCoins) {
    return NextResponse.json(
      { error: `Minimum conversion is ${settings.redeemMinCoins} coins` },
      { status: 400 }
    );
  }

  const monthStart = getMonthStart();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [user, monthlyRedemption] = await Promise.all([
        tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            coinBalance: true,
            accountStatus: true,
            isSuspicious: true,
          },
        }),
        tx.coinRedemption.aggregate({
          where: {
            userId: session.user.id,
            status: "APPROVED",
            createdAt: { gte: monthStart },
          },
          _sum: { coinsUsed: true },
        }),
      ]);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.accountStatus !== "ACTIVE" || user.isSuspicious) {
        throw new Error("Account is not eligible for coin conversion");
      }

      if (user.coinBalance < requestedCoins) {
        throw new Error("Insufficient coin balance");
      }

      const monthUsed = monthlyRedemption._sum.coinsUsed ?? 0;
      if (monthUsed + requestedCoins > settings.redeemMonthlyLimit) {
        throw new Error(`Monthly conversion limit is ${settings.redeemMonthlyLimit} coins`);
      }

      const perkCreditsGranted = Math.max(1, Math.floor(requestedCoins * settings.coinToPerkRate));

      await tx.user.update({
        where: { id: user.id },
        data: {
          coinBalance: { decrement: requestedCoins },
          perkCreditBalance: { increment: perkCreditsGranted },
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: requestedCoins,
          type: "DEBIT",
          source: "COIN_REDEMPTION",
          note: `Converted ${requestedCoins} coins into ${perkCreditsGranted} perk credits`,
        },
      });

      await tx.coinRedemption.create({
        data: {
          userId: user.id,
          coinsUsed: requestedCoins,
          perkCreditsGranted,
          status: "APPROVED",
        },
      });

      await tx.perkTransaction.create({
        data: {
          userId: user.id,
          amount: perkCreditsGranted,
          type: "CREDIT",
          source: "REFERRAL_CONVERSION",
          note: `Referral conversion (${requestedCoins} coins to ${perkCreditsGranted} perk credits)`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: user.id,
          title: "Coins converted",
          message: `${requestedCoins} coins were converted into ${perkCreditsGranted} internal perk credits. These credits stay inside FreeEarnHub and cannot be withdrawn as cash.`,
          type: "SUCCESS",
        },
      });

      await tx.notificationDeliveryLog.create({
        data: {
          userId: user.id,
          notificationId: notification.id,
          templateKey: "coins.converted_to_perks",
          channel: "IN_APP",
          status: "SENT",
          payload: { requestedCoins, perkCreditsGranted },
        },
      });

      return { perkCreditsGranted };
    });

    return NextResponse.json({
      message: "Coins converted into perk credits",
      perkCreditsGranted: result.perkCreditsGranted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redemption failed" },
      { status: 400 }
    );
  }
}

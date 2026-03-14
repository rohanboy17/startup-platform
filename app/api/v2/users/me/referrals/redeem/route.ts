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
      { error: `Minimum redemption is ${settings.redeemMinCoins} coins` },
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
            balance: true,
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
        throw new Error("Account is not eligible for coin redemption");
      }

      if (user.coinBalance < requestedCoins) {
        throw new Error("Insufficient coin balance");
      }

      const monthUsed = monthlyRedemption._sum.coinsUsed ?? 0;
      if (monthUsed + requestedCoins > settings.redeemMonthlyLimit) {
        throw new Error(`Monthly redemption limit is ${settings.redeemMonthlyLimit} coins`);
      }

      const walletAmount = Number((requestedCoins * settings.coinToInrRate).toFixed(2));

      await tx.user.update({
        where: { id: user.id },
        data: {
          coinBalance: { decrement: requestedCoins },
          balance: { increment: walletAmount },
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: requestedCoins,
          type: "DEBIT",
          source: "COIN_REDEMPTION",
          note: `Redeemed ${requestedCoins} coins into wallet`,
        },
      });

      await tx.coinRedemption.create({
        data: {
          userId: user.id,
          coinsUsed: requestedCoins,
          walletAmount,
          status: "APPROVED",
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          amount: walletAmount,
          type: "CREDIT",
          note: `Coin redemption (${requestedCoins} coins)`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: user.id,
          title: "Coins redeemed",
          message: `${requestedCoins} coins were redeemed into INR ${walletAmount.toFixed(2)} in your wallet.`,
          type: "SUCCESS",
        },
      });

      await tx.notificationDeliveryLog.create({
        data: {
          userId: user.id,
          notificationId: notification.id,
          templateKey: "coins.redeemed",
          channel: "IN_APP",
          status: "SENT",
          payload: { requestedCoins, walletAmount },
        },
      });

      return { walletAmount };
    });

    return NextResponse.json({
      message: "Coins redeemed successfully",
      walletAmount: result.walletAmount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redemption failed" },
      { status: 400 }
    );
  }
}

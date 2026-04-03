import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

const REFERRAL_REWARD_COINS = Number(process.env.REFERRAL_REWARD_COINS ?? 100);
const REFERRAL_NEW_USER_BONUS_COINS = Number(process.env.REFERRAL_NEW_USER_BONUS_COINS ?? 25);
const COIN_REDEEM_MIN = Number(process.env.COIN_REDEEM_MIN ?? 500);
const COIN_REDEEM_MONTHLY_LIMIT = Number(process.env.COIN_REDEEM_MONTHLY_LIMIT ?? 2000);
const COIN_TO_PERK_RATE = Number(process.env.COIN_TO_PERK_RATE ?? process.env.COIN_TO_INR_RATE ?? 0.02);

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function slugifySeed(input: string) {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function getReferralSettings() {
  return {
    referralRewardCoins: REFERRAL_REWARD_COINS,
    newUserBonusCoins: REFERRAL_NEW_USER_BONUS_COINS,
    redeemMinCoins: COIN_REDEEM_MIN,
    redeemMonthlyLimit: COIN_REDEEM_MONTHLY_LIMIT,
    coinToPerkRate: COIN_TO_PERK_RATE,
  };
}

export async function ensureReferralCodeForUser(
  db: PrismaLike,
  input: { userId: string; name?: string | null; email?: string | null }
) {
  const existing = await db.referralCode.findUnique({ where: { userId: input.userId } });
  if (existing) {
    return existing;
  }

  const base = slugifySeed(input.name || input.email || "EARNHUB").slice(0, 6) || "EARN";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `${base}${suffix}`.slice(0, 12);
    try {
      return await db.referralCode.create({
        data: {
          userId: input.userId,
          code,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("Unique constraint")) {
        throw error;
      }
    }
  }

  return db.referralCode.create({
    data: {
      userId: input.userId,
      code: crypto.randomBytes(5).toString("hex").toUpperCase(),
    },
  });
}

export async function applyReferralRewardsOnFirstApproval(
  tx: Prisma.TransactionClient,
  input: {
    referredUserId: string;
    campaignTitle: string;
  }
) {
  const invite = await tx.referralInvite.findUnique({
    where: { referredUserId: input.referredUserId },
    include: {
      referrer: {
        select: {
          id: true,
          ipAddress: true,
          accountStatus: true,
          isSuspicious: true,
        },
      },
      referred: {
        select: {
          id: true,
          ipAddress: true,
          accountStatus: true,
          isSuspicious: true,
        },
      },
    },
  });

  if (!invite || invite.status !== "PENDING") {
    return { rewarded: false as const };
  }

  if (
    invite.referrer.accountStatus !== "ACTIVE" ||
    invite.referred.accountStatus !== "ACTIVE" ||
    invite.referrer.isSuspicious ||
    invite.referred.isSuspicious ||
    (invite.referrer.ipAddress &&
      invite.referred.ipAddress &&
      invite.referrer.ipAddress === invite.referred.ipAddress)
  ) {
    await tx.referralInvite.update({
      where: { id: invite.id },
      data: { status: "REJECTED" },
    });
    return { rewarded: false as const, rejected: true as const };
  }

  await tx.user.update({
    where: { id: invite.referrerUserId },
    data: { coinBalance: { increment: REFERRAL_REWARD_COINS } },
  });

  await tx.coinTransaction.create({
    data: {
      userId: invite.referrerUserId,
      amount: REFERRAL_REWARD_COINS,
      type: "CREDIT",
      source: "REFERRAL_REWARD",
      note: `Referral qualified after first approved submission (${input.campaignTitle})`,
    },
  });

  if (REFERRAL_NEW_USER_BONUS_COINS > 0) {
    await tx.user.update({
      where: { id: invite.referredUserId },
      data: { coinBalance: { increment: REFERRAL_NEW_USER_BONUS_COINS } },
    });

    await tx.coinTransaction.create({
      data: {
        userId: invite.referredUserId,
        amount: REFERRAL_NEW_USER_BONUS_COINS,
        type: "CREDIT",
        source: "REFERRAL_WELCOME_BONUS",
        note: "Welcome referral bonus after first approved submission",
      },
    });
  }

  await tx.referralInvite.update({
    where: { id: invite.id },
    data: {
      status: "REWARDED",
      qualifiedAt: new Date(),
      rewardedAt: new Date(),
    },
  });

  const referrerNotification = await tx.notification.create({
    data: {
      userId: invite.referrerUserId,
      title: "Referral reward unlocked",
      message: `${REFERRAL_REWARD_COINS} FreeEarnHub Coins were added after your referral completed a first approved task.`,
      type: "SUCCESS",
    },
  });

  await tx.notificationDeliveryLog.create({
    data: {
      userId: invite.referrerUserId,
      notificationId: referrerNotification.id,
      templateKey: "referral.rewarded",
      channel: "IN_APP",
      status: "SENT",
      payload: { coins: REFERRAL_REWARD_COINS, referredUserId: invite.referredUserId },
    },
  });

  if (REFERRAL_NEW_USER_BONUS_COINS > 0) {
    const referredNotification = await tx.notification.create({
      data: {
        userId: invite.referredUserId,
        title: "Welcome coins added",
        message: `${REFERRAL_NEW_USER_BONUS_COINS} FreeEarnHub Coins were added to your account after your first approved task.`,
        type: "SUCCESS",
      },
    });

    await tx.notificationDeliveryLog.create({
      data: {
        userId: invite.referredUserId,
        notificationId: referredNotification.id,
        templateKey: "referral.welcome_bonus",
        channel: "IN_APP",
        status: "SENT",
        payload: { coins: REFERRAL_NEW_USER_BONUS_COINS },
      },
    });
  }

  return { rewarded: true as const };
}

export function getMonthStart(input = new Date()) {
  return new Date(input.getFullYear(), input.getMonth(), 1, 0, 0, 0, 0);
}


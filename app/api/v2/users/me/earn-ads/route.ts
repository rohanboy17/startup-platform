import { NextResponse } from "next/server";
import { AdWatchSessionStatus, NotificationType, TransactionType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_RECOMMENDATION_BOOST_COST,
  DEFAULT_RECOMMENDATION_BOOST_HOURS,
  getAdSessionExpiry,
  getIndiaDayEnd,
  getIndiaDayStart,
  getRecommendationBoostExpiry,
  getSecondsRemaining,
  isRecommendationBoostActive,
  resolveAdRewardSettings,
} from "@/lib/ad-rewards";
import { getAppSettings } from "@/lib/system-settings";

const HEARTBEAT_GAP_RESET_SECONDS = 5;
const HEARTBEAT_INCREMENT_CAP_SECONDS = 2;

async function expireStalePendingSessions(userId: string, now = new Date()) {
  await prisma.adWatchSession.updateMany({
    where: {
      userId,
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
}

async function buildEarnAdsPayload(userId: string) {
  const settings = resolveAdRewardSettings(await getAppSettings());
  const now = new Date();
  const dayStart = getIndiaDayStart(now);
  const dayEnd = getIndiaDayEnd(now);

  await expireStalePendingSessions(userId, now);

  const [user, rewardedToday, activeSession, latestRewarded, recentPerkActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        perkCreditBalance: true,
        recommendationBoostExpiresAt: true,
      },
    }),
    prisma.adWatchSession.count({
      where: {
        userId,
        status: "REWARDED",
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.adWatchSession.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adWatchSession.findFirst({
      where: {
        userId,
        status: "REWARDED",
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.perkTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        amount: true,
        type: true,
        source: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const remainingAds = Math.max(0, settings.maxAdsPerDay - rewardedToday);
  const cooldownUntil = latestRewarded?.completedAt
    ? new Date(latestRewarded.completedAt.getTime() + settings.cooldownSeconds * 1000)
    : null;
  const cooldownLeftSeconds = activeSession ? 0 : getSecondsRemaining(cooldownUntil, now);
  const remainingWatchSeconds = activeSession
    ? Math.max(0, activeSession.requiredSeconds - activeSession.watchedSeconds)
    : 0;

  return {
    settings,
    summary: {
      availableAdsToday: settings.maxAdsPerDay,
      adsWatchedToday: rewardedToday,
      remainingAds,
      perkCreditsPerAd: settings.perkCreditsPerAd,
    },
    perks: {
      balance: user.perkCreditBalance,
      recommendationBoostCost: DEFAULT_RECOMMENDATION_BOOST_COST,
      recommendationBoostHours: DEFAULT_RECOMMENDATION_BOOST_HOURS,
      recommendationBoostActive: isRecommendationBoostActive(user.recommendationBoostExpiresAt, now),
      recommendationBoostEndsAt: user.recommendationBoostExpiresAt?.toISOString() ?? null,
    },
    cooldownLeftSeconds,
    cooldownEndsAt: cooldownUntil?.toISOString() ?? null,
    canStart: !activeSession && remainingAds > 0 && cooldownLeftSeconds === 0,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          perkCredits: activeSession.reward,
          status: activeSession.status,
          startedAt: activeSession.createdAt.toISOString(),
          expiresAt: activeSession.expiresAt.toISOString(),
          watchedSeconds: activeSession.watchedSeconds,
          requiredSeconds: activeSession.requiredSeconds,
          remainingSeconds: remainingWatchSeconds,
          progressPercent: Math.round((activeSession.watchedSeconds / Math.max(1, activeSession.requiredSeconds)) * 100),
        }
      : null,
    recentPerkActivity: recentPerkActivity.map((item) => ({
      id: item.id,
      amount: item.amount,
      type: item.type,
      source: item.source,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const appSettings = await getAppSettings();
  if (!appSettings.bonusAdsEnabled) {
    return NextResponse.json(
      { error: "Beta perk trials are disabled while launch hardening is in progress." },
      { status: 403 }
    );
  }

  const payload = await buildEarnAdsPayload(session.user.id);
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = session.user.id;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "start" | "heartbeat" | "complete" | "expire" | "activateBoost";
    sessionId?: string;
  };

  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const appSettings = await getAppSettings();
  if (!appSettings.bonusAdsEnabled) {
    return NextResponse.json(
      { error: "Beta perk trials are disabled while launch hardening is in progress." },
      { status: 403 }
    );
  }

  const settings = resolveAdRewardSettings(appSettings);
  const now = new Date();
  const dayStart = getIndiaDayStart(now);
  const dayEnd = getIndiaDayEnd(now);

  await expireStalePendingSessions(userId, now);

  if (body.action === "start") {
    const [rewardedToday, activeSession, latestRewarded] = await Promise.all([
      prisma.adWatchSession.count({
        where: {
          userId,
          status: "REWARDED",
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      prisma.adWatchSession.findFirst({
        where: {
          userId,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.adWatchSession.findFirst({
        where: {
          userId,
          status: "REWARDED",
        },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    if (activeSession) {
      return NextResponse.json(
        {
          error: "An ad is already in progress.",
          payload: await buildEarnAdsPayload(userId),
        },
        { status: 409 }
      );
    }

    if (rewardedToday >= settings.maxAdsPerDay) {
      return NextResponse.json(
        {
          error: "Daily ad limit reached.",
          payload: await buildEarnAdsPayload(userId),
        },
        { status: 400 }
      );
    }

    const cooldownUntil = latestRewarded?.completedAt
      ? new Date(latestRewarded.completedAt.getTime() + settings.cooldownSeconds * 1000)
      : null;
    const cooldownLeftSeconds = getSecondsRemaining(cooldownUntil, now);
    if (cooldownLeftSeconds > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldownLeftSeconds}s before starting the next ad.`,
          payload: await buildEarnAdsPayload(userId),
        },
        { status: 400 }
      );
    }

    const expectedFinishAt = new Date(now.getTime() + settings.watchSeconds * 1000);
    await prisma.adWatchSession.create({
      data: {
        userId,
        reward: settings.perkCreditsPerAd,
        requiredSeconds: settings.watchSeconds,
        watchedSeconds: 0,
        lastHeartbeatAt: now,
        availableAt: expectedFinishAt,
        expiresAt: getAdSessionExpiry(expectedFinishAt),
      },
    });

    return NextResponse.json({
      message: "Ad started.",
      payload: await buildEarnAdsPayload(userId),
    });
  }

  if (body.action === "heartbeat") {
    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const sessionRow = await prisma.adWatchSession.findUnique({
      where: { id: body.sessionId },
    });

    if (!sessionRow || sessionRow.userId !== userId) {
      return NextResponse.json({ error: "Ad session not found" }, { status: 404 });
    }

    if (sessionRow.status !== "PENDING") {
      return NextResponse.json({
        payload: await buildEarnAdsPayload(userId),
      });
    }

    if (sessionRow.expiresAt.getTime() < now.getTime()) {
      await prisma.adWatchSession.update({
        where: { id: sessionRow.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Ad session expired. Start another ad." }, { status: 400 });
    }

    const deltaSeconds = sessionRow.lastHeartbeatAt
      ? Math.max(0, Math.floor((now.getTime() - sessionRow.lastHeartbeatAt.getTime()) / 1000))
      : 1;
    const countedSeconds =
      deltaSeconds > 0 && deltaSeconds <= HEARTBEAT_GAP_RESET_SECONDS
        ? Math.min(deltaSeconds, HEARTBEAT_INCREMENT_CAP_SECONDS)
        : 0;
    const nextWatchedSeconds = Math.min(sessionRow.requiredSeconds, sessionRow.watchedSeconds + countedSeconds);
    const remainingSeconds = Math.max(0, sessionRow.requiredSeconds - nextWatchedSeconds);

    await prisma.adWatchSession.update({
      where: { id: sessionRow.id },
      data: {
        watchedSeconds: nextWatchedSeconds,
        lastHeartbeatAt: now,
        availableAt: new Date(now.getTime() + remainingSeconds * 1000),
      },
    });

    return NextResponse.json({
      payload: await buildEarnAdsPayload(userId),
    });
  }

  if (body.action === "complete") {
    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const sessionRow = await prisma.adWatchSession.findUnique({
      where: { id: body.sessionId },
    });

    if (!sessionRow || sessionRow.userId !== userId) {
      return NextResponse.json({ error: "Ad session not found" }, { status: 404 });
    }

    if (sessionRow.status === "REWARDED") {
      return NextResponse.json(
        {
          message: "Perk credits already claimed.",
          payload: await buildEarnAdsPayload(userId),
        },
        { status: 200 }
      );
    }

    if (sessionRow.status !== "PENDING") {
      return NextResponse.json({ error: "Ad session is no longer active." }, { status: 400 });
    }

    if (sessionRow.expiresAt.getTime() < now.getTime()) {
      await prisma.adWatchSession.update({
        where: { id: sessionRow.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Ad session expired. Start another ad." }, { status: 400 });
    }

    if (sessionRow.watchedSeconds < sessionRow.requiredSeconds) {
      return NextResponse.json(
        {
          error: "Keep the ad active in the foreground until the timer completes.",
          payload: await buildEarnAdsPayload(userId),
        },
        { status: 400 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        const freshSession = await tx.adWatchSession.findUnique({
          where: { id: sessionRow.id },
        });

        if (!freshSession || freshSession.userId !== userId || freshSession.status !== AdWatchSessionStatus.PENDING) {
          throw new Error("SESSION_NOT_PENDING");
        }

        if (freshSession.expiresAt.getTime() < now.getTime()) {
          await tx.adWatchSession.update({
            where: { id: freshSession.id },
            data: { status: "EXPIRED" },
          });
          throw new Error("SESSION_EXPIRED");
        }

        if (freshSession.watchedSeconds < freshSession.requiredSeconds) {
          throw new Error("WATCH_NOT_COMPLETE");
        }

        const rewardedToday = await tx.adWatchSession.count({
          where: {
            userId,
            status: "REWARDED",
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        });

        if (rewardedToday >= settings.maxAdsPerDay) {
          throw new Error("DAILY_LIMIT_REACHED");
        }

        const marked = await tx.adWatchSession.updateMany({
          where: {
            id: freshSession.id,
            userId,
            status: "PENDING",
          },
          data: {
            status: "REWARDED",
            completedAt: now,
          },
        });

        if (marked.count !== 1) {
          throw new Error("SESSION_ALREADY_PROCESSED");
        }

        const perkCredits = Math.max(1, Math.floor(freshSession.reward));

        await tx.user.update({
          where: { id: userId },
          data: {
            perkCreditBalance: { increment: perkCredits },
          },
        });

        await tx.perkTransaction.create({
          data: {
            userId,
            amount: perkCredits,
            type: TransactionType.CREDIT,
            source: "AD_REWARD_PERK",
            note: `Earned ${perkCredits} perk credit${perkCredits === 1 ? "" : "s"} from a completed ad trial`,
          },
        });

        await tx.activityLog.create({
          data: {
            userId,
            action: "BONUS_AD_PERK_REWARDED",
            entity: "AD_WATCH",
            details: `Rewarded ${perkCredits} perk credits from bonus ad session ${freshSession.id}`,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: "Perk credits added",
            message: `${perkCredits} perk credit${perkCredits === 1 ? " was" : "s were"} added after the ad finished. These credits stay inside FreeEarnHub and cannot be withdrawn as cash.`,
            type: NotificationType.SUCCESS,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "SESSION_EXPIRED") {
        return NextResponse.json({ error: "Ad session expired. Start another ad." }, { status: 400 });
      }
      if (message === "DAILY_LIMIT_REACHED") {
        return NextResponse.json({ error: "Daily ad limit reached." }, { status: 400 });
      }
      if (message === "WATCH_NOT_COMPLETE") {
        return NextResponse.json(
          {
            error: "Keep the ad active in the foreground until the timer completes.",
            payload: await buildEarnAdsPayload(userId),
          },
          { status: 400 }
        );
      }
      if (message === "SESSION_ALREADY_PROCESSED" || message === "SESSION_NOT_PENDING") {
        return NextResponse.json(
          {
            message: "Perk credits already claimed.",
            payload: await buildEarnAdsPayload(userId),
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: "Unable to complete ad right now." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Perk credits added.",
      payload: await buildEarnAdsPayload(userId),
    });
  }

  if (body.action === "activateBoost") {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            perkCreditBalance: true,
            recommendationBoostExpiresAt: true,
          },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (user.perkCreditBalance < DEFAULT_RECOMMENDATION_BOOST_COST) {
          throw new Error("INSUFFICIENT_PERK_CREDITS");
        }

        const baseTime =
          user.recommendationBoostExpiresAt && user.recommendationBoostExpiresAt.getTime() > now.getTime()
            ? user.recommendationBoostExpiresAt
            : now;
        const nextExpiry = getRecommendationBoostExpiry(baseTime);

        await tx.user.update({
          where: { id: userId },
          data: {
            perkCreditBalance: { decrement: DEFAULT_RECOMMENDATION_BOOST_COST },
            recommendationBoostExpiresAt: nextExpiry,
          },
        });

        await tx.perkTransaction.create({
          data: {
            userId,
            amount: DEFAULT_RECOMMENDATION_BOOST_COST,
            type: TransactionType.DEBIT,
            source: "RECOMMENDATION_BOOST",
            note: `Activated recommendation boost for ${DEFAULT_RECOMMENDATION_BOOST_HOURS} hours`,
          },
        });

        await tx.activityLog.create({
          data: {
            userId,
            action: "RECOMMENDATION_BOOST_ACTIVATED",
            entity: "PERK",
            details: `Spent ${DEFAULT_RECOMMENDATION_BOOST_COST} perk credits; boost active until ${nextExpiry.toISOString()}`,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: "Recommendation boost active",
            message: `Your recommendation boost is active for ${DEFAULT_RECOMMENDATION_BOOST_HOURS} hours. High-availability tasks will be pinned first while it stays active.`,
            type: NotificationType.SUCCESS,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "INSUFFICIENT_PERK_CREDITS") {
        return NextResponse.json(
          {
            error: `You need ${DEFAULT_RECOMMENDATION_BOOST_COST} perk credits to activate the boost.`,
            payload: await buildEarnAdsPayload(userId),
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: "Unable to activate the recommendation boost right now." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Recommendation boost activated.",
      payload: await buildEarnAdsPayload(userId),
    });
  }

  if (body.action === "expire") {
    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const sessionRow = await prisma.adWatchSession.findUnique({
      where: { id: body.sessionId },
    });

    if (!sessionRow || sessionRow.userId !== userId) {
      return NextResponse.json({ error: "Ad session not found" }, { status: 404 });
    }

    if (sessionRow.status === "PENDING") {
      await prisma.adWatchSession.update({
        where: { id: sessionRow.id },
        data: {
          status: "EXPIRED",
        },
      });
    }

    return NextResponse.json({
      message: "Ad session expired because the page lost focus.",
      payload: await buildEarnAdsPayload(userId),
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { AdWatchSessionStatus, NotificationType, TransactionType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAdSessionExpiry,
  getIndiaDayEnd,
  getIndiaDayStart,
  getSecondsRemaining,
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

  const [rewardedToday, activeSession, latestRewarded, recentRewards] = await Promise.all([
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
    prisma.adWatchSession.findMany({
      where: {
        userId,
        status: "REWARDED",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reward: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  ]);

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
      rewardPerAd: settings.rewardPerAd,
    },
    cooldownLeftSeconds,
    cooldownEndsAt: cooldownUntil?.toISOString() ?? null,
    canStart: !activeSession && remainingAds > 0 && cooldownLeftSeconds === 0,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          reward: activeSession.reward,
          status: activeSession.status,
          startedAt: activeSession.createdAt.toISOString(),
          expiresAt: activeSession.expiresAt.toISOString(),
          watchedSeconds: activeSession.watchedSeconds,
          requiredSeconds: activeSession.requiredSeconds,
          remainingSeconds: remainingWatchSeconds,
          progressPercent: Math.round((activeSession.watchedSeconds / Math.max(1, activeSession.requiredSeconds)) * 100),
        }
      : null,
    recentRewards: recentRewards.map((item) => ({
      id: item.id,
      reward: item.reward,
      createdAt: (item.completedAt ?? item.createdAt).toISOString(),
    })),
  };
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
    action?: "start" | "heartbeat" | "complete";
    sessionId?: string;
  };

  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const settings = resolveAdRewardSettings(await getAppSettings());
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
        reward: settings.rewardPerAd,
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
          message: "Reward already claimed.",
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

        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: freshSession.reward },
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            amount: freshSession.reward,
            type: TransactionType.CREDIT,
            note: "Bonus ad reward",
          },
        });

        await tx.activityLog.create({
          data: {
            userId,
            action: "BONUS_AD_REWARDED",
            entity: "AD_WATCH",
            details: `Rewarded INR ${freshSession.reward.toFixed(2)} from bonus ad session ${freshSession.id}`,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: "Bonus reward added",
            message: `INR ${freshSession.reward.toFixed(2)} was added to your wallet after the ad finished.`,
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
            message: "Reward already claimed.",
            payload: await buildEarnAdsPayload(userId),
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: "Unable to complete ad right now." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Bonus reward added.",
      payload: await buildEarnAdsPayload(userId),
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

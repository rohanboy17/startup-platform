import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentIstResetBoundary } from "@/lib/level";

function isAuthorized(req: Request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return false;
  }

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === configured) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${configured}`) {
    return true;
  }

  return false;
}

async function runReset() {
  const resetAt = getCurrentIstResetBoundary(new Date());

  const result = await prisma.user.updateMany({
    where: {
      role: "USER",
      deletedAt: null,
      lastLevelResetAt: { lt: resetAt },
    },
    data: {
      dailySubmits: 0,
      dailyApproved: 0,
      level: "L1",
      lastLevelResetAt: resetAt,
    },
  });

  return NextResponse.json({
    message: "Daily level reset completed",
    updatedUsers: result.count,
    resetAt: resetAt.toISOString(),
    timezone: "Asia/Calcutta",
  });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runReset();
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runReset();
}

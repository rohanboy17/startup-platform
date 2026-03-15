import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function istMidnight(now = new Date()): Date {
  // Vercel Cron runs in UTC. We want a stable daily reset boundary at 12:00 AM IST,
  // independent of cron jitter (late/early execution).
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = get("year");
  const m = get("month");
  const d = get("day");
  if (!y || !m || !d) return new Date(now);
  // Parse with explicit offset for IST.
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

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
  const resetAt = istMidnight(new Date());

  const result = await prisma.user.updateMany({
    where: {
      role: "USER",
      deletedAt: null,
      lastLevelResetAt: { lt: resetAt },
    },
    data: {
      dailySubmits: 0,
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

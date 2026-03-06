import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.user.updateMany({
    where: {
      lastLevelResetAt: {
        lte: cutoff,
      },
    },
    data: {
      dailySubmits: 0,
      level: "L1",
      lastLevelResetAt: new Date(),
    },
  });

  return NextResponse.json({
    message: "Daily level reset completed",
    updatedUsers: result.count,
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

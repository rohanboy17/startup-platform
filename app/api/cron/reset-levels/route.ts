import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

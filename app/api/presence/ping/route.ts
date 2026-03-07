import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);

    const recentPing = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: "PRESENCE_PING",
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });

    if (!recentPing) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "PRESENCE_PING",
          entity: "PRESENCE",
          details: session.user.role || "UNKNOWN",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Presence ping failed" }, { status: 500 });
  }
}


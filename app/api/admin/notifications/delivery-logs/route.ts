import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "SENT" | "FAILED" | "SKIPPED" | null;

  const logs = await prisma.notificationDeliveryLog.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { email: true, role: true, mobile: true } },
      notification: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const summary = {
    sent: logs.filter((l) => l.status === "SENT").length,
    failed: logs.filter((l) => l.status === "FAILED").length,
    skipped: logs.filter((l) => l.status === "SKIPPED").length,
  };

  return NextResponse.json({ logs, summary });
}

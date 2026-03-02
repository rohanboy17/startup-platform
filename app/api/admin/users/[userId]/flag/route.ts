import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-flag-user:${ip}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const { action, reason } = (await req.json()) as {
    action?: "FLAG" | "UNFLAG";
    reason?: string;
  };

  if (!action || !["FLAG", "UNFLAG"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts cannot be flagged" },
      { status: 400 }
    );
  }

  if (action === "FLAG") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspicious: true,
        suspiciousReason: reason?.trim() || "Flagged by admin",
        flaggedAt: new Date(),
      },
      select: {
        id: true,
        isSuspicious: true,
        suspiciousReason: true,
        flaggedAt: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: userId,
      action: "USER_FLAGGED",
      details: reason?.trim() || "Flagged by admin",
    });

    return NextResponse.json({ message: "User flagged", user: updated });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isSuspicious: false,
      suspiciousReason: null,
      flaggedAt: null,
    },
    select: {
      id: true,
      isSuspicious: true,
      suspiciousReason: true,
      flaggedAt: true,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: "USER_UNFLAGGED",
    details: reason?.trim() || "Unflagged by admin",
  });

  return NextResponse.json({ message: "User unflagged", user: updated });
}

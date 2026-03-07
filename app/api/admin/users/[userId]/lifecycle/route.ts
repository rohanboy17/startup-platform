import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

type LifecycleAction = "SOFT_DELETE" | "REACTIVATE";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<unknown> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-user-lifecycle:${ip}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = (await params) as { userId: string };
  const { action, reason } = (await req.json()) as {
    action?: LifecycleAction;
    reason?: string;
  };

  if (!action || !["SOFT_DELETE", "REACTIVATE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const trimmedReason = reason?.trim() || "";

  if (action === "SOFT_DELETE" && !trimmedReason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  if (session.user.id === userId && action === "SOFT_DELETE") {
    return NextResponse.json({ error: "You cannot soft-delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, accountStatus: true, statusReason: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "ADMIN" && action === "SOFT_DELETE") {
    return NextResponse.json({ error: "Admin accounts cannot be soft-deleted" }, { status: 400 });
  }

  if (action === "SOFT_DELETE") {
    if (target.accountStatus === "BANNED" && target.statusReason?.startsWith("SOFT_DELETE:")) {
      return NextResponse.json({ message: "User already soft-deleted" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "BANNED",
        statusReason: `SOFT_DELETE: ${trimmedReason}`,
        statusUpdatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        accountStatus: true,
        statusReason: true,
      },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: userId,
      action: "USER_SOFT_DELETED",
      details: `email=${target.email}, reason=${trimmedReason}`,
    });

    return NextResponse.json({ message: "User soft-deleted", user: updated });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
      statusReason: null,
      statusUpdatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      statusReason: true,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: "USER_REACTIVATED",
    details: `email=${target.email}`,
  });

  return NextResponse.json({ message: "User reactivated", user: updated });
}

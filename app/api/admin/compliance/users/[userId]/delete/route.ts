import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const body = (await req.json()) as {
    action?: "SOFT_DELETE" | "RESTORE" | "ANONYMIZE";
    reason?: string;
  };

  const action = body.action;
  const reason = body.reason?.trim() || "";

  if (!action || !["SOFT_DELETE", "RESTORE", "ANONYMIZE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "SOFT_DELETE") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "BANNED",
        statusReason: `SOFT_DELETE: ${reason || "Admin action"}`,
        statusUpdatedAt: new Date(),
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
        deletionReason: reason || "Admin action",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: userId,
        action: "COMPLIANCE_SOFT_DELETE_USER",
        beforeState: target,
        afterState: updated,
      },
    });

    return NextResponse.json({ message: "User soft deleted", user: updated });
  }

  if (action === "RESTORE") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "ACTIVE",
        statusReason: null,
        statusUpdatedAt: new Date(),
        deletedAt: null,
        deletedByUserId: null,
        deletionReason: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: userId,
        action: "COMPLIANCE_RESTORE_USER",
        beforeState: target,
        afterState: updated,
      },
    });

    return NextResponse.json({ message: "User restored", user: updated });
  }

  const anonEmail = `deleted-${target.id}@deleted.local`;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Deleted User",
      email: anonEmail,
      password: "DELETED",
      ipAddress: null,
      kycNotes: null,
      suspiciousReason: null,
      statusReason: `ANONYMIZED: ${reason || "Privacy request"}`,
      statusUpdatedAt: new Date(),
      deletedAt: target.deletedAt || new Date(),
      deletedByUserId: session.user.id,
      deletionReason: reason || "Privacy request",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: userId,
      action: "COMPLIANCE_ANONYMIZE_USER",
      details: `oldEmail=${target.email}`,
      beforeState: { id: target.id, email: target.email, name: target.name },
      afterState: { id: updated.id, email: updated.email, name: updated.name },
    },
  });

  return NextResponse.json({ message: "User anonymized", user: updated });
}

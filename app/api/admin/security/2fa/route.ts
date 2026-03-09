import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, twoFactorEnabled: true, twoFactorEnabledAt: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled is required" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: body.enabled,
      twoFactorEnabledAt: body.enabled ? new Date() : null,
    },
    select: { id: true, twoFactorEnabled: true, twoFactorEnabledAt: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: session.user.id,
      action: body.enabled ? "ADMIN_2FA_ENABLED" : "ADMIN_2FA_DISABLED",
      details: null,
    },
  });

  return NextResponse.json({ message: "Admin 2FA settings updated", user: updated });
}

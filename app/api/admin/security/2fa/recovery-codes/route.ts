import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAdminRecoveryCodes } from "@/lib/admin-2fa";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [activeCount, usedCount, latest] = await Promise.all([
    prisma.adminTwoFactorRecoveryCode.count({
      where: { userId: session.user.id, usedAt: null },
    }),
    prisma.adminTwoFactorRecoveryCode.count({
      where: { userId: session.user.id, usedAt: { not: null } },
    }),
    prisma.adminTwoFactorRecoveryCode.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    activeCount,
    usedCount,
    lastGeneratedAt: latest?.createdAt || null,
  });
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    return NextResponse.json({ error: "Enable admin 2FA before generating recovery codes" }, { status: 400 });
  }

  const codes = await generateAdminRecoveryCodes({ userId: session.user.id });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: session.user.id,
      action: "ADMIN_2FA_RECOVERY_CODES_REGENERATED",
      details: `count=${codes.length}`,
    },
  });

  await prisma.securityEvent.create({
    data: {
      kind: "ADMIN_2FA_RECOVERY_CODES_REGENERATED",
      severity: "MEDIUM",
      status: "OPEN",
      userId: session.user.id,
      message: "Admin regenerated 2FA recovery codes",
      metadata: { count: codes.length },
    },
  });

  return NextResponse.json({
    message: "Recovery codes generated. Save them now.",
    codes,
  });
}

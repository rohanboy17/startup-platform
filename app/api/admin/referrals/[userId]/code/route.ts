import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as { isActive?: boolean } | null;

  if (!body || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive is required" }, { status: 400 });
  }

  const referralCode = await prisma.referralCode.findUnique({
    where: { userId },
    select: {
      id: true,
      code: true,
      isActive: true,
      userId: true,
    },
  });

  if (!referralCode) {
    return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
  }

  if (referralCode.isActive === body.isActive) {
    return NextResponse.json({
      message: body.isActive ? "Referral code already enabled" : "Referral code already disabled",
      referralCode,
    });
  }

  const updated = await prisma.referralCode.update({
    where: { id: referralCode.id },
    data: { isActive: body.isActive },
    select: {
      id: true,
      code: true,
      isActive: true,
      userId: true,
    },
  });

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: body.isActive ? "admin.referral_code.enable" : "admin.referral_code.disable",
    details: `Referral code ${updated.code} ${body.isActive ? "enabled" : "disabled"}`,
    beforeState: referralCode,
    afterState: updated,
    ipAddress,
  });

  return NextResponse.json({
    message: body.isActive ? "Referral code enabled" : "Referral code disabled",
    referralCode: updated,
  });
}

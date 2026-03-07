import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-user-kyc:${ip}`,
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
  const { kycStatus, notes } = (await req.json()) as {
    kycStatus?: KycStatus;
    notes?: string;
  };

  if (!kycStatus || !["PENDING", "VERIFIED", "REJECTED"].includes(kycStatus)) {
    return NextResponse.json({ error: "Invalid KYC status" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, kycStatus: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role !== "BUSINESS") {
    return NextResponse.json({ error: "KYC management is only for business accounts" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus,
      kycNotes: notes?.trim() || null,
      kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
    },
    select: {
      id: true,
      email: true,
      kycStatus: true,
      kycNotes: true,
      kycVerifiedAt: true,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: "BUSINESS_KYC_UPDATED",
    details: `email=${user.email}, from=${user.kycStatus}, to=${kycStatus}, notes=${notes?.trim() || "-"}`,
  });

  return NextResponse.json({
    message: "Business KYC updated",
    user: updated,
  });
}


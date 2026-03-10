import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type KycStatus = "VERIFIED" | "REJECTED";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { requestId } = await params;
  const { status, notes } = (await req.json()) as { status?: KycStatus; notes?: string };
  const trimmedNotes = notes?.trim() || null;

  if (!status || !["VERIFIED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const request = await prisma.businessKycRequest.findUnique({
    where: { id: requestId },
    include: { business: { select: { id: true, email: true } } },
  });

  if (!request) {
    return NextResponse.json({ error: "KYC request not found" }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "KYC request already reviewed" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.businessKycRequest.update({
      where: { id: requestId },
      data: {
        status,
        notes: trimmedNotes,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    await tx.user.update({
      where: { id: request.businessId },
      data: {
        kycStatus: status,
        kycNotes: trimmedNotes,
        kycVerifiedAt: status === "VERIFIED" ? new Date() : null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: request.businessId,
        action: "ADMIN_KYC_REVIEWED",
        details: `requestId=${requestId}, status=${status}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: request.businessId,
        title: status === "VERIFIED" ? "KYC verified" : "KYC rejected",
        message:
          status === "VERIFIED"
            ? "Your business KYC is verified. You can now create campaigns."
            : `Your business KYC was rejected.${trimmedNotes ? ` Reason: ${trimmedNotes}` : ""}`,
        type: status === "VERIFIED" ? "INFO" : "WARNING",
      },
    });
  });

  return NextResponse.json({ message: "KYC review saved" });
}


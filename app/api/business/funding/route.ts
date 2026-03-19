import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBusinessBilling, getBusinessContext } from "@/lib/business-context";
import { buildFundingWhatsappLink, getManualBusinessFundingConfig } from "@/lib/manual-business-funding";
import { getMinFundingThreshold } from "@/lib/notifications";
import { autoFlagSuspiciousUser } from "@/lib/safety";
import { createSecurityEvent } from "@/lib/security";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  if (!canManageBusinessBilling(context.accessRole)) {
    return NextResponse.json({ error: "Only the business owner can submit funding requests" }, { status: 403 });
  }

  const { amount, referenceId, proofImage, utr } = (await req.json()) as {
    amount?: number;
    referenceId?: string;
    proofImage?: string;
    utr?: string;
  };

  const amountNumber = Number(amount);
  const normalizedReferenceId = typeof referenceId === "string" ? referenceId.trim().toUpperCase() : "";
  const normalizedProofImage = typeof proofImage === "string" ? proofImage.trim() : "";
  const normalizedUtr = typeof utr === "string" ? utr.trim() : "";

  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Enter a valid funding amount" }, { status: 400 });
  }

  const minFunding = getMinFundingThreshold();
  if (amountNumber < minFunding) {
    return NextResponse.json(
      { error: `Minimum funding amount is INR ${minFunding}` },
      { status: 400 }
    );
  }

  if (!normalizedReferenceId) {
    return NextResponse.json({ error: "Reference ID is required" }, { status: 400 });
  }

  if (!normalizedProofImage || !/^https:\/\/.+/i.test(normalizedProofImage)) {
    return NextResponse.json({ error: "Funding screenshot is required" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const [existingReference, duplicateProof, recentAttempts] = await Promise.all([
    prisma.businessFunding.findUnique({
      where: { referenceId: normalizedReferenceId },
      select: { id: true },
    }),
    prisma.businessFunding.findFirst({
      where: { proofImage: normalizedProofImage },
      select: { id: true, businessId: true, referenceId: true },
    }),
    prisma.businessFunding.count({
      where: {
        businessId: context.businessUserId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (existingReference) {
    return NextResponse.json({ error: "Reference ID has already been used" }, { status: 400 });
  }

  let flaggedReason: string | null = null;

  if (duplicateProof) {
    flaggedReason = `Duplicate proof image reused from reference ${duplicateProof.referenceId}`;
    await autoFlagSuspiciousUser({
      userId: context.businessUserId,
      reason: flaggedReason,
    });
    await createSecurityEvent({
      kind: "BUSINESS_FUNDING_DUPLICATE_PROOF",
      severity: "HIGH",
      message: "Duplicate business funding proof screenshot detected",
      ipAddress: ip,
      userId: context.businessUserId,
      metadata: {
        currentReferenceId: normalizedReferenceId,
        existingReferenceId: duplicateProof.referenceId,
      },
    });
  }

  if (recentAttempts >= 5) {
    const reason = `High funding request volume: ${recentAttempts + 1} requests in 24h`;
    flaggedReason = flaggedReason ? `${flaggedReason}; ${reason}` : reason;
    await autoFlagSuspiciousUser({
      userId: context.businessUserId,
      reason,
    });
    await createSecurityEvent({
      kind: "BUSINESS_FUNDING_RATE_ANOMALY",
      severity: "MEDIUM",
      message: "High number of business funding requests in 24 hours",
      ipAddress: ip,
      userId: context.businessUserId,
      metadata: {
        attemptsLast24h: recentAttempts + 1,
      },
    });
  }

  const record = await prisma.$transaction(async (tx) => {
    const funding = await tx.businessFunding.create({
      data: {
        businessId: context.businessUserId,
        amount: amountNumber,
        referenceId: normalizedReferenceId,
        proofImage: normalizedProofImage,
        utr: normalizedUtr || null,
        flaggedReason,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_FUNDING_REQUEST_CREATED",
        entity: "BusinessFunding",
        details: `fundingId=${funding.id}, businessId=${context.businessUserId}, referenceId=${normalizedReferenceId}, amount=${amountNumber}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: context.businessUserId,
        title: "Funding request submitted",
        message: `Your funding request for INR ${amountNumber.toFixed(2)} is waiting for admin review.`,
        type: flaggedReason ? "WARNING" : "INFO",
      },
    });

    return funding;
  });

  const config = getManualBusinessFundingConfig();
  const whatsappLink = buildFundingWhatsappLink({
    whatsappNumber: config.whatsappNumber,
    amount: amountNumber,
    referenceId: normalizedReferenceId,
    utr: normalizedUtr || null,
  });

  return NextResponse.json({
    message: flaggedReason
      ? "Funding request submitted and marked for manual review"
      : "Funding request submitted successfully",
    funding: record,
    whatsappLink,
    flaggedReason,
  });
}

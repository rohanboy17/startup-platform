import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { consumeRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

type ReviewAction = "APPROVE" | "REJECT";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ fundingId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-manual-funding:${ip}`,
    limit: 50,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { fundingId } = await context.params;
  const body = (await req.json()) as {
    action?: ReviewAction;
    reviewNote?: string;
  };

  if (!fundingId || !body.action || !["APPROVE", "REJECT"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid review request" }, { status: 400 });
  }

  const reviewNote = body.reviewNote?.trim() || null;
  if (body.action === "REJECT" && !reviewNote) {
    return NextResponse.json({ error: "Review note is required for rejection" }, { status: 400 });
  }

  const existing = await prisma.businessFunding.findUnique({
    where: { id: fundingId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Funding request not found" }, { status: 404 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "This funding request has already been reviewed" }, { status: 400 });
  }

  const reviewedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    if (body.action === "APPROVE") {
      const updatedFunding = await tx.businessFunding.update({
        where: { id: fundingId },
        data: {
          status: "APPROVED",
          reviewNote,
          reviewedAt,
          reviewedByUserId: session.user.id,
        },
      });

      await tx.user.update({
        where: { id: existing.businessId },
        data: {
          balance: { increment: existing.amount },
        },
      });

      await tx.businessWallet.upsert({
        where: { businessId: existing.businessId },
        update: {
          balance: { increment: existing.amount },
          totalFunded: { increment: existing.amount },
        },
        create: {
          businessId: existing.businessId,
          balance: existing.amount,
          totalFunded: existing.amount,
          totalSpent: 0,
          totalRefund: 0,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: existing.businessId,
          type: "CREDIT",
          amount: existing.amount,
          note: `Manual funding approved (${existing.referenceId})`,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "BUSINESS_FUNDING_REQUEST_APPROVED",
          entity: "BusinessFunding",
          details: `fundingId=${existing.id}, businessId=${existing.businessId}, referenceId=${existing.referenceId}, amount=${existing.amount}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: existing.businessId,
          title: "Funding approved",
          message: `INR ${existing.amount.toFixed(2)} has been added to your business wallet for reference ${existing.referenceId}.`,
          type: "SUCCESS",
        },
      });

      return updatedFunding;
    }

    const updatedFunding = await tx.businessFunding.update({
      where: { id: fundingId },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedAt,
        reviewedByUserId: session.user.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BUSINESS_FUNDING_REQUEST_REJECTED",
        entity: "BusinessFunding",
        details: `fundingId=${existing.id}, businessId=${existing.businessId}, referenceId=${existing.referenceId}, note=${reviewNote || "-"}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: existing.businessId,
        title: "Funding request rejected",
        message: reviewNote
          ? `Funding request ${existing.referenceId} was rejected. Note: ${reviewNote}`
          : `Funding request ${existing.referenceId} was rejected.`,
        type: "WARNING",
      },
    });

    return updatedFunding;
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: existing.businessId,
    action:
      body.action === "APPROVE"
        ? "BUSINESS_FUNDING_REQUEST_APPROVED"
        : "BUSINESS_FUNDING_REQUEST_REJECTED",
    details: `business=${existing.business.email}, referenceId=${existing.referenceId}, amount=${existing.amount}, note=${reviewNote || "-"}`,
    ipAddress: ip,
    beforeState: {
      status: existing.status,
      reviewNote: existing.reviewNote,
      reviewedAt: existing.reviewedAt,
    },
    afterState: {
      status: result.status,
      reviewNote: result.reviewNote,
      reviewedAt: result.reviewedAt,
      reviewedByUserId: result.reviewedByUserId,
    },
  });

  return NextResponse.json({
    message:
      body.action === "APPROVE"
        ? "Funding approved and business wallet credited"
        : "Funding request rejected",
  });
}

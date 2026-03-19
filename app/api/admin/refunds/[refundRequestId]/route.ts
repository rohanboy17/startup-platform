import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { consumeRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { applyFundingFee } from "@/lib/commission";
import { getAppSettings } from "@/lib/system-settings";

type ReviewAction = "APPROVE" | "REJECT";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ refundRequestId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-manual-refund:${ip}`,
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

  const { refundRequestId } = await context.params;
  const body = (await req.json()) as {
    action?: ReviewAction;
    reviewNote?: string;
  };

  if (!refundRequestId || !body.action || !["APPROVE", "REJECT"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid review request" }, { status: 400 });
  }

  const reviewNote = body.reviewNote?.trim() || null;
  if (body.action === "REJECT" && !reviewNote) {
    return NextResponse.json({ error: "Review note is required for rejection" }, { status: 400 });
  }

  const existing = await prisma.businessRefundRequest.findUnique({
    where: { id: refundRequestId },
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
    return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "This refund request has already been reviewed" }, { status: 400 });
  }

  const reviewedAt = new Date();

  const appSettings = await getAppSettings();
  const { fee, net, feeRate } = applyFundingFee(existing.amount, appSettings.businessRefundFeeRate);

  const result = await prisma.$transaction(async (tx) => {
    if (body.action === "APPROVE") {
      const wallet = await tx.businessWallet.findUnique({
        where: { businessId: existing.businessId },
      });

      if (!wallet || wallet.balance < existing.amount) {
        throw new Error("Current business wallet balance is lower than the requested refund amount");
      }

      const updatedRefund = await tx.businessRefundRequest.update({
        where: { id: refundRequestId },
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
          balance: { decrement: existing.amount },
        },
      });

      await tx.businessWallet.update({
        where: { businessId: existing.businessId },
        data: {
          balance: { decrement: existing.amount },
          totalRefund: { increment: net },
        },
      });

      if (fee > 0) {
        await tx.platformEarning.create({
          data: {
            amount: fee,
            source: `Business refund fee (${(feeRate * 100).toFixed(2)}%)`,
          },
        });

        await tx.platformTreasury.upsert({
          where: { id: "main" },
          update: { balance: { increment: fee } },
          create: { id: "main", balance: fee },
        });
      }

      await tx.walletTransaction.create({
        data: {
          userId: existing.businessId,
          type: "DEBIT",
          amount: existing.amount,
          note:
            fee > 0
              ? `Manual refund approved; ${(feeRate * 100).toFixed(0)}% fee applied`
              : "Manual refund approved",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "BUSINESS_REFUND_REQUEST_APPROVED",
          entity: "BusinessRefundRequest",
          details: `refundRequestId=${existing.id}, businessId=${existing.businessId}, amount=${existing.amount}, fee=${fee}, net=${net}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: existing.businessId,
          title: "Refund approved",
          message:
            fee > 0
              ? `Your refund request for INR ${existing.amount.toFixed(2)} was approved after a ${(feeRate * 100).toFixed(2)}% fee.`
              : `Your refund request for INR ${existing.amount.toFixed(2)} was approved.`,
          type: "SUCCESS",
        },
      });

      return updatedRefund;
    }

    const updatedRefund = await tx.businessRefundRequest.update({
      where: { id: refundRequestId },
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
        action: "BUSINESS_REFUND_REQUEST_REJECTED",
        entity: "BusinessRefundRequest",
        details: `refundRequestId=${existing.id}, businessId=${existing.businessId}, note=${reviewNote || "-"}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: existing.businessId,
        title: "Refund request rejected",
        message: reviewNote
          ? `Your refund request was rejected. Note: ${reviewNote}`
          : "Your refund request was rejected.",
        type: "WARNING",
      },
    });

    return updatedRefund;
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: existing.businessId,
    action:
      body.action === "APPROVE"
        ? "BUSINESS_REFUND_REQUEST_APPROVED"
        : "BUSINESS_REFUND_REQUEST_REJECTED",
    details: `business=${existing.business.email}, amount=${existing.amount}, note=${reviewNote || "-"}`,
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
        ? "Refund approved and wallet updated"
        : "Refund request rejected",
  });
}

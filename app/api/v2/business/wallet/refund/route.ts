import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBusinessBilling, getBusinessContext } from "@/lib/business-context";

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
    return NextResponse.json({ error: "Only the business owner can request refunds" }, { status: 403 });
  }

  const { amount, requestNote } = (await req.json()) as {
    amount?: number;
    requestNote?: string;
  };
  const amountNumber = Number(amount);
  const normalizedRequestNote = typeof requestNote === "string" ? requestNote.trim() : "";

  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const [wallet, pendingRefunds, recentRequests] = await Promise.all([
    prisma.businessWallet.findUnique({
      where: { businessId: context.businessUserId },
    }),
    prisma.businessRefundRequest.aggregate({
      where: {
        businessId: context.businessUserId,
        status: "PENDING",
      },
      _sum: { amount: true },
    }),
    prisma.businessRefundRequest.count({
      where: {
        businessId: context.businessUserId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const refundableBalance = Math.max(0, (wallet?.balance || 0) - (pendingRefunds._sum.amount || 0));

  if (!wallet || refundableBalance < amountNumber) {
    return NextResponse.json(
      { error: "Refund amount is higher than the currently refundable wallet balance" },
      { status: 400 }
    );
  }

  let flaggedReason: string | null = null;
  if (recentRequests >= 3) {
    flaggedReason = `High refund request volume: ${recentRequests + 1} requests in 24h`;
  }

  const refundRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.businessRefundRequest.create({
      data: {
        businessId: context.businessUserId,
        amount: amountNumber,
        requestNote: normalizedRequestNote || null,
        flaggedReason,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_REFUND_REQUEST_CREATED",
        entity: "BusinessRefundRequest",
        details: `refundRequestId=${created.id}, businessId=${context.businessUserId}, amount=${amountNumber}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: context.businessUserId,
        title: "Refund request submitted",
        message: `Your refund request for INR ${amountNumber.toFixed(2)} is waiting for admin review.`,
        type: flaggedReason ? "WARNING" : "INFO",
      },
    });

    return created;
  });

  return NextResponse.json({
    message: flaggedReason
      ? "Refund request submitted and marked for manual review"
      : "Refund request submitted",
    refundRequest,
    flaggedReason,
  });
}

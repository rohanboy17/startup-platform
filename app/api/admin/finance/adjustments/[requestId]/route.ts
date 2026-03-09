import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type ReviewAction = "APPROVE" | "REJECT";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { requestId } = await params;
  const body = (await req.json()) as { action?: ReviewAction; reviewNote?: string };
  const action = body.action;
  const reviewNote = body.reviewNote?.trim() || null;

  if (!action || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const request = await prisma.walletAdjustmentRequest.findUnique({
    where: { id: requestId },
    include: {
      targetUser: {
        select: { id: true, email: true, balance: true },
      },
      requestedByUser: {
        select: { id: true, email: true },
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Adjustment request not found" }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
  }

  if (action === "REJECT") {
    const rejected = await prisma.walletAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: request.targetUserId,
      action: "WALLET_ADJUSTMENT_REJECTED",
      details: `requestId=${request.id}, type=${request.type}, amount=${request.amount}, note=${reviewNote || "-"}`,
    });

    return NextResponse.json({ message: "Adjustment request rejected", request: rejected });
  }

  const approved = await prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: request.targetUserId },
      select: { id: true, balance: true },
    });

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    if (request.type === "DEBIT" && targetUser.balance < request.amount) {
      throw new Error("Insufficient user balance for debit");
    }

    await tx.user.update({
      where: { id: request.targetUserId },
      data: {
        balance:
          request.type === "CREDIT"
            ? { increment: request.amount }
            : { decrement: request.amount },
      },
    });

    const walletTx = await tx.walletTransaction.create({
      data: {
        userId: request.targetUserId,
        amount: request.amount,
        type: request.type,
        note: `Approved admin adjustment (${request.id}) - ${request.reason}`,
      },
      select: { id: true },
    });

    const updatedRequest = await tx.walletAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewNote,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
        walletTransactionId: walletTx.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_APPROVED_WALLET_ADJUSTMENT",
        entity: "WalletAdjustmentRequest",
        details: `requestId=${request.id}, targetUserId=${request.targetUserId}, type=${request.type}, amount=${request.amount}`,
      },
    });

    return updatedRequest;
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: request.targetUserId,
    action: "WALLET_ADJUSTMENT_APPROVED",
    details: `requestId=${request.id}, type=${request.type}, amount=${request.amount}, note=${reviewNote || "-"}`,
  });

  return NextResponse.json({ message: "Adjustment request approved", request: approved });
}


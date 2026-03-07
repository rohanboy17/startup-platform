import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

type WalletAction = "CREDIT" | "DEBIT";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-business-wallet:${ip}`,
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

  const { businessId, action, amount, note } = (await req.json()) as {
    businessId?: string;
    action?: WalletAction;
    amount?: number;
    note?: string;
  };

  const amountNumber = Number(amount);
  if (!businessId || !action || !["CREDIT", "DEBIT"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const business = await prisma.user.findUnique({
    where: { id: businessId },
    select: { id: true, email: true, role: true, balance: true },
  });

  if (!business || business.role !== "BUSINESS") {
    return NextResponse.json({ error: "Invalid business account" }, { status: 400 });
  }

  if (action === "DEBIT" && business.balance < amountNumber) {
    return NextResponse.json({ error: "Insufficient business balance" }, { status: 400 });
  }

  const wallet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: businessId },
      data: {
        balance: action === "CREDIT" ? { increment: amountNumber } : { decrement: amountNumber },
      },
    });

    const nextWallet = await tx.businessWallet.upsert({
      where: { businessId },
      update: {
        balance: action === "CREDIT" ? { increment: amountNumber } : { decrement: amountNumber },
        totalFunded: action === "CREDIT" ? { increment: amountNumber } : undefined,
        totalRefund: action === "DEBIT" ? { increment: amountNumber } : undefined,
      },
      create: {
        businessId,
        balance: action === "CREDIT" ? amountNumber : 0,
        totalFunded: action === "CREDIT" ? amountNumber : 0,
        totalRefund: action === "DEBIT" ? amountNumber : 0,
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: businessId,
        amount: amountNumber,
        type: action,
        note: note?.trim() || `Admin business wallet ${action.toLowerCase()}`,
      },
    });

    return nextWallet;
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: businessId,
    action: "BUSINESS_WALLET_ADJUSTED",
    details: `email=${business.email}, action=${action}, amount=${amountNumber}, note=${note?.trim() || "-"}`,
  });

  return NextResponse.json({
    message: "Business wallet updated",
    wallet,
  });
}


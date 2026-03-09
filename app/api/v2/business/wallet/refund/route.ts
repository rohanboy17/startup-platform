import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyFundingFee } from "@/lib/commission";
import { getAppSettings } from "@/lib/system-settings";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { amount } = (await req.json()) as { amount?: number };
  const amountNumber = Number(amount);

  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const wallet = await prisma.businessWallet.findUnique({
    where: { businessId: session.user.id },
  });

  if (!wallet || wallet.balance < amountNumber) {
    return NextResponse.json({ error: "Insufficient business wallet balance" }, { status: 400 });
  }

  const appSettings = await getAppSettings();
  const { fee, net, feeRate } = applyFundingFee(amountNumber, appSettings.fundingFeeRate);

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.businessWallet.update({
      where: { businessId: session.user.id },
      data: {
        balance: { decrement: amountNumber },
        totalRefund: { increment: net },
      },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        balance: { decrement: amountNumber },
      },
    });

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

    await tx.walletTransaction.create({
      data: {
        userId: session.user.id,
        type: "DEBIT",
        amount: amountNumber,
        note: `Business refund requested; ${(feeRate * 100).toFixed(0)}% fee applied`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BUSINESS_REFUND_REQUESTED",
        entity: "BusinessWallet",
        details: `gross=${amountNumber}, fee=${fee}, netRefund=${net}`,
      },
    });

    return next;
  });

  return NextResponse.json({
    message: "Refund initiated",
    netRefund: net,
    fee,
    wallet: updated,
  });
}

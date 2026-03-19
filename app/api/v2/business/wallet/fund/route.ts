import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyFundingFee } from "@/lib/commission";
import { getAppSettings } from "@/lib/system-settings";
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
    return NextResponse.json({ error: "Only the business owner can fund the wallet" }, { status: 403 });
  }

  const { amount } = (await req.json()) as { amount?: number };
  const amountNumber = Number(amount);

  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const appSettings = await getAppSettings();
  const { fee, net, feeRate } = applyFundingFee(amountNumber, appSettings.fundingFeeRate);

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.businessWallet.upsert({
      where: { businessId: context.businessUserId },
      update: {
        balance: { increment: net },
        totalFunded: { increment: net },
      },
      create: {
        businessId: context.businessUserId,
        balance: net,
        totalFunded: net,
      },
    });

    await tx.user.update({
      where: { id: context.businessUserId },
      data: {
        balance: { increment: net },
      },
    });

    if (fee > 0) {
      await tx.platformEarning.create({
        data: {
          amount: fee,
          source: `Business deposit fee (${(feeRate * 100).toFixed(2)}%)`,
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
        userId: context.businessUserId,
        type: "CREDIT",
        amount: net,
        note:
          fee > 0
            ? `Business funding credited after ${(feeRate * 100).toFixed(0)}% fee`
            : "Business funding credited",
      },
    });

    return wallet;
  });

  return NextResponse.json({
    message: "Business wallet funded",
    netCredited: net,
    fee,
    wallet: result,
  });
}

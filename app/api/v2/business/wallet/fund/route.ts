import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyFundingFee } from "@/lib/commission";

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

  const { fee, net, feeRate } = applyFundingFee(amountNumber);

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.businessWallet.upsert({
      where: { businessId: session.user.id },
      update: {
        balance: { increment: net },
        totalFunded: { increment: net },
      },
      create: {
        businessId: session.user.id,
        balance: net,
        totalFunded: net,
      },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        balance: { increment: net },
      },
    });

    await tx.platformEarning.create({
      data: {
        amount: fee,
        source: "Business deposit fee (3%)",
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
        type: "CREDIT",
        amount: net,
        note: `Business funding credited after ${(feeRate * 100).toFixed(0)}% fee`,
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

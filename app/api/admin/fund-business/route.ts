import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMinFundingThreshold } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { businessId, amount } = await req.json();
  const amountNumber = Number(amount);
  const minFunding = getMinFundingThreshold();

  if (!businessId || Number.isNaN(amountNumber) || amountNumber < minFunding) {
    return NextResponse.json(
      { error: `Minimum funding amount is INR ${minFunding}` },
      { status: 400 }
    );
  }

  const business = await prisma.user.findUnique({
    where: { id: businessId },
  });

  if (!business || business.role !== "BUSINESS") {
    return NextResponse.json({ error: "Invalid business account" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: businessId },
      data: {
        balance: {
          increment: amountNumber,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: businessId,
        amount: amountNumber,
        type: "CREDIT",
        note: "Admin funded business wallet",
      },
    });
  });

  return NextResponse.json({
    message: "Business funded successfully",
  });
}

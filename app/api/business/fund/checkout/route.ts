import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMinFundingThreshold } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = consumeRateLimit({
      key: `business-fund-checkout:${ip}`,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await auth();
    if (!session || session.user.role !== "BUSINESS") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { amount } = (await req.json()) as { amount?: number };
    const amountNumber = Number(amount);
    const minFunding = getMinFundingThreshold();

    if (Number.isNaN(amountNumber) || amountNumber < minFunding) {
      return NextResponse.json(
        { error: `Minimum funding amount is INR ${minFunding}` },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayConfig();
    if (!razorpay.ready || !razorpay.keyId) {
      return NextResponse.json(
        {
          error:
            "Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        },
        { status: 503 }
      );
    }

    const receipt = `fund_${session.user.id.slice(0, 8)}_${Date.now()}`;
    const amountInPaise = Math.round(amountNumber * 100);

    const localOrder = await prisma.paymentOrder.create({
      data: {
        userId: session.user.id,
        amount: amountNumber,
        currency: "INR",
        receipt,
        status: "CREATED",
      },
      select: {
        id: true,
      },
    });

    const remoteOrder = await createRazorpayOrder({
      amountInPaise,
      receipt,
      notes: {
        userId: session.user.id,
        paymentOrderId: localOrder.id,
      },
    });

    await prisma.paymentOrder.update({
      where: { id: localOrder.id },
      data: {
        providerOrderId: remoteOrder.id,
      },
    });

    return NextResponse.json({
      keyId: razorpay.keyId,
      paymentOrderId: localOrder.id,
      razorpayOrderId: remoteOrder.id,
      amountInPaise: remoteOrder.amount,
      amount: amountNumber,
      currency: remoteOrder.currency,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to initialize payment",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

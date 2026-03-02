import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { settleBusinessFunding } from "@/lib/payment-credit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "BUSINESS") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const result = await settleBusinessFunding({
      providerOrderId: body.razorpay_order_id,
      providerPaymentId: body.razorpay_payment_id,
      source: "VERIFY_API",
      expectedUserId: session.user.id,
    });

    return NextResponse.json({
      message: result.alreadyProcessed ? "Payment already processed" : "Wallet funded successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Payment verification failed",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

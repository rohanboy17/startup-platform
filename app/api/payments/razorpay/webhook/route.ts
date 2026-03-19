import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { settleBusinessFunding } from "@/lib/payment-credit";

type RazorpayPaymentCapturedPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
};

export async function POST(req: Request) {
  try {
    if (process.env.MANUAL_BUSINESS_FUNDING_ONLY !== "false") {
      return NextResponse.json({
        ok: true,
        message: "Manual business funding mode is active. Razorpay webhook is currently parked.",
      });
    }

    const signature = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const verified = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!verified) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as RazorpayPaymentCapturedPayload;
    if (event.event !== "payment.captured") {
      return NextResponse.json({ ok: true });
    }

    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    await settleBusinessFunding({
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      source: "WEBHOOK",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

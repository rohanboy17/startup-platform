import crypto from "crypto";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  return {
    keyId,
    keySecret,
    webhookSecret,
    ready: Boolean(keyId && keySecret),
  };
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayOrder(params: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const config = getRazorpayConfig();
  if (!config.keyId || !config.keySecret) {
    throw new Error("Razorpay is not configured");
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader(config.keyId, config.keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountInPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
      payment_capture: 1,
    }),
  });

  const raw = await res.text();
  const data = raw ? (JSON.parse(raw) as RazorpayOrderResponse & { error?: { description?: string } }) : null;

  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.description || "Failed to create payment order");
  }

  return data;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const config = getRazorpayConfig();
  if (!config.keySecret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(params.signature));
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}) {
  const config = getRazorpayConfig();
  if (!config.webhookSecret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(params.rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(params.signature));
}

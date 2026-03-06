"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

const MIN_FUNDING_THRESHOLD = Number(process.env.NEXT_PUBLIC_MIN_FUNDING_THRESHOLD ?? 500);
const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

export default function BusinessFundingPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const presets = useMemo(() => [1000, 2500, 5000, 10000], []);

  async function ensureRazorpayScriptLoaded() {
    if ((window as Window & { Razorpay?: unknown }).Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector(`script[src="${RAZORPAY_SDK_URL}"]`);
      if (existing) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SDK_URL;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function submitFunding() {
    setLoading(true);
    setMessage("");

    const sdkReady = await ensureRazorpayScriptLoaded();
    if (!sdkReady) {
      setLoading(false);
      setMessage("Failed to load payment gateway. Try again.");
      return;
    }

    const res = await fetch("/api/business/fund/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });

    const raw = await res.text();
    let data: {
      error?: string;
      keyId?: string;
      razorpayOrderId?: string;
      amountInPaise?: number;
      currency?: string;
    } = {};

    try {
      data = raw
        ? (JSON.parse(raw) as { error?: string; message?: string; balance?: number })
        : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Funding failed");
      return;
    }

    const RazorpayCtor = (window as Window & {
      Razorpay?: new (options: {
        key: string;
        amount: number;
        currency: string;
        name: string;
        description: string;
        order_id: string;
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => Promise<void>;
        theme?: { color: string };
      }) => { open: () => void };
    }).Razorpay;

    if (!RazorpayCtor || !data.keyId || !data.razorpayOrderId || !data.amountInPaise) {
      setLoading(false);
      setMessage("Payment initialization failed. Missing gateway details.");
      return;
    }

    const payment = new RazorpayCtor({
      key: data.keyId,
      amount: data.amountInPaise,
      currency: data.currency || "INR",
      name: "EarnHub",
      description: "Business wallet top-up",
      order_id: data.razorpayOrderId,
      handler: async (response) => {
        const verifyRes = await fetch("/api/business/fund/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });

        const verifyRaw = await verifyRes.text();
        let verifyData: { message?: string; error?: string } = {};
        try {
          verifyData = verifyRaw
            ? (JSON.parse(verifyRaw) as { message?: string; error?: string })
            : {};
        } catch {
          verifyData = { error: "Unexpected verification response" };
        }

        if (!verifyRes.ok) {
          setMessage(verifyData.error || "Payment verification failed");
          return;
        }

        setMessage(verifyData.message || "Wallet funded successfully");
        setAmount("");
        emitDashboardLiveRefresh();
      },
      theme: { color: "#10b981" },
    });

    payment.open();
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Wallet Funding</h2>

      <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-5 p-6">
          <p className="text-sm text-white/70">
            Add balance before launching campaigns. Minimum funding is INR{" "}
            {formatMoney(MIN_FUNDING_THRESHOLD)}.
          </p>

          <div className="flex flex-wrap gap-2">
            {presets.map((value) => (
              <Button key={value} variant="outline" onClick={() => setAmount(String(value))}>
                INR {formatMoney(value)}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <Input
              type="number"
              min={MIN_FUNDING_THRESHOLD}
              placeholder={`Enter amount (min INR ${formatMoney(MIN_FUNDING_THRESHOLD)})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button onClick={submitFunding} disabled={loading} className="w-full">
              {loading ? "Initializing payment..." : "Pay & Fund Wallet"}
            </Button>
          </div>

          {message ? <p className="text-sm text-white/80">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ReceiptText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

type FundingData = {
  wallet: {
    balance: number;
    totalFunded: number;
    totalSpent: number;
    totalRefund: number;
    lockedBudget: number;
  };
  config: {
    fundingFeeRate: number;
    minFundingThreshold: number;
  };
  paymentOrders: Array<{
    id: string;
    amount: number;
    currency: string;
    status: "CREATED" | "PAID" | "FAILED";
    receipt: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    createdAt: string;
    updatedAt: string;
    paidAt: string | null;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    note: string | null;
    createdAt: string;
  }>;
  stats: {
    depositsCount: number;
    refundCount: number;
    lastPaidAt: string | null;
  };
  error?: string;
};

function orderTone(status: string) {
  if (status === "PAID") return "text-emerald-200";
  if (status === "FAILED") return "text-rose-200";
  return "text-amber-100";
}

function dateTimeLabel(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BusinessFundingPage() {
  const [data, setData] = useState<FundingData | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/funding", { credentials: "include" });
    const raw = await res.text();
    let parsed: FundingData = {
      wallet: { balance: 0, totalFunded: 0, totalSpent: 0, totalRefund: 0, lockedBudget: 0 },
      config: { fundingFeeRate: 0.03, minFundingThreshold: 500 },
      paymentOrders: [],
      transactions: [],
      stats: { depositsCount: 0, refundCount: 0, lastPaidAt: null },
    };
    try {
      parsed = raw ? (JSON.parse(raw) as FundingData) : parsed;
    } catch {
      setError("Unexpected server response");
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load funding data");
      return;
    }
    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  const presets = useMemo(() => [1000, 2500, 5000, 10000], []);
  const minFundingThreshold = data?.config.minFundingThreshold ?? 500;
  const feeRate = data?.config.fundingFeeRate ?? 0.03;
  const fundNumber = Number(fundAmount) || 0;
  const refundNumber = Number(refundAmount) || 0;
  const fundFee = Number((fundNumber * feeRate).toFixed(2));
  const fundNet = Math.max(0, Number((fundNumber - fundFee).toFixed(2)));
  const refundFee = Number((refundNumber * feeRate).toFixed(2));
  const refundNet = Math.max(0, Number((refundNumber - refundFee).toFixed(2)));

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
    setError("");

    const sdkReady = await ensureRazorpayScriptLoaded();
    if (!sdkReady) {
      setLoading(false);
      setError("Failed to load payment gateway. Try again.");
      return;
    }

    const res = await fetch("/api/business/fund/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: fundNumber }),
    });

    const raw = await res.text();
    let payload: {
      error?: string;
      keyId?: string;
      razorpayOrderId?: string;
      amountInPaise?: number;
      currency?: string;
    } = {};
    try {
      payload = raw ? (JSON.parse(raw) as typeof payload) : {};
    } catch {
      payload = { error: "Unexpected server response" };
    }

    setLoading(false);

    if (!res.ok) {
      setError(payload.error || "Funding failed");
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

    if (!RazorpayCtor || !payload.keyId || !payload.razorpayOrderId || !payload.amountInPaise) {
      setError("Payment initialization failed. Missing gateway details.");
      return;
    }

    const payment = new RazorpayCtor({
      key: payload.keyId,
      amount: payload.amountInPaise,
      currency: payload.currency || "INR",
      name: "EarnHub",
      description: "Business wallet top-up",
      order_id: payload.razorpayOrderId,
      handler: async (response) => {
        const verifyRes = await fetch("/api/business/fund/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });

        const verifyRaw = await verifyRes.text();
        let verifyData: { message?: string; error?: string } = {};
        try {
          verifyData = verifyRaw ? (JSON.parse(verifyRaw) as { message?: string; error?: string }) : {};
        } catch {
          verifyData = { error: "Unexpected verification response" };
        }

        if (!verifyRes.ok) {
          setError(verifyData.error || "Payment verification failed");
          return;
        }

        setMessage(verifyData.message || "Wallet funded successfully");
        setFundAmount("");
        emitDashboardLiveRefresh();
        void load();
      },
      theme: { color: "#10b981" },
    });

    payment.open();
  }

  async function submitRefund() {
    setRefundLoading(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/wallet/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: refundNumber }),
    });

    const raw = await res.text();
    let payload: { message?: string; error?: string } = {};
    try {
      payload = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      payload = { error: "Unexpected server response" };
    }

    setRefundLoading(false);

    if (!res.ok) {
      setError(payload.error || "Refund failed");
      return;
    }

    setMessage(payload.message || "Refund initiated");
    setRefundAmount("");
    emitDashboardLiveRefresh();
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading funding center...</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Funding and billing</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Wallet Funding</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Manage deposits, refunds, payment status, and wallet ledger activity from one screen.
        </p>
      </div>

      {data.wallet.balance < minFundingThreshold ? (
        <Card className="rounded-3xl border-amber-400/20 bg-amber-500/10 backdrop-blur-md">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-amber-200" />
              <div>
                <p className="font-medium text-amber-100">Low balance warning</p>
                <p className="text-sm text-amber-100/75">
                  Wallet is below the recommended threshold of INR {formatMoney(minFundingThreshold)}.
                </p>
              </div>
            </div>
            <p className="text-sm text-amber-100/80">Add funds to avoid campaign launch failures.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Available wallet</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-200">INR {formatMoney(data.wallet.balance)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Locked budget</p>
            <p className="mt-2 text-3xl font-semibold text-sky-200">INR {formatMoney(data.wallet.lockedBudget)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Total funded</p>
            <p className="mt-2 text-3xl font-semibold text-white">INR {formatMoney(data.wallet.totalFunded)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Last successful payment</p>
            <p className="mt-2 text-sm font-medium text-white">{dateTimeLabel(data.stats.lastPaidAt)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="text-emerald-200" size={18} />
              <div>
                <p className="text-sm text-white/60">Add funds</p>
                <h3 className="text-xl font-semibold text-white">Business wallet top-up</h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {presets.map((value) => (
                <Button key={value} variant="outline" onClick={() => setFundAmount(String(value))}>
                  INR {formatMoney(value)}
                </Button>
              ))}
            </div>

            <Input
              type="number"
              min={minFundingThreshold}
              placeholder={`Enter amount (min INR ${formatMoney(minFundingThreshold)})`}
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Gross amount</span>
                <span>INR {formatMoney(fundNumber)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Platform funding fee ({(feeRate * 100).toFixed(2)}%)</span>
                <span>INR {formatMoney(fundFee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-medium text-emerald-200">
                <span>Net wallet credit</span>
                <span>INR {formatMoney(fundNet)}</span>
              </div>
            </div>

            <Button onClick={() => void submitFunding()} disabled={loading || fundNumber < minFundingThreshold} className="w-full">
              {loading ? "Initializing payment..." : "Pay and Fund Wallet"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="text-sky-200" size={18} />
              <div>
                <p className="text-sm text-white/60">Request refund</p>
                <h3 className="text-xl font-semibold text-white">Move unused wallet out</h3>
              </div>
            </div>

            <Input
              type="number"
              min="1"
              max={Math.floor(data.wallet.balance)}
              placeholder="Enter refund amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Requested amount</span>
                <span>INR {formatMoney(refundNumber)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Refund processing fee ({(feeRate * 100).toFixed(2)}%)</span>
                <span>INR {formatMoney(refundFee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-medium text-sky-200">
                <span>Net refund</span>
                <span>INR {formatMoney(refundNet)}</span>
              </div>
            </div>

            <Button
              onClick={() => void submitRefund()}
              disabled={refundLoading || refundNumber <= 0 || refundNumber > data.wallet.balance}
              variant="outline"
              className="w-full"
            >
              {refundLoading ? "Processing..." : "Request Refund"}
            </Button>

            <p className="text-xs text-white/45">
              Refunds reduce available wallet immediately and apply the same configured fee logic as deposits.
            </p>
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <ReceiptText size={18} className="text-white/75" />
              <div>
                <p className="text-sm text-white/60">Payment orders</p>
                <h3 className="text-xl font-semibold text-white">Checkout and settlement history</h3>
              </div>
            </div>

            {data.paymentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                No payment orders yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.paymentOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">INR {formatMoney(order.amount)}</p>
                        <p className="mt-1 text-xs text-white/45">Receipt: {order.receipt}</p>
                      </div>
                      <span className={`text-sm font-medium ${orderTone(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-white/50">
                      <p>Created: {dateTimeLabel(order.createdAt)}</p>
                      <p>Paid: {dateTimeLabel(order.paidAt)}</p>
                      <p>Provider order: {order.providerOrderId || "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-white/75" />
              <div>
                <p className="text-sm text-white/60">Wallet ledger</p>
                <h3 className="text-xl font-semibold text-white">Recent funding and spend activity</h3>
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                No wallet activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{transaction.note || "Wallet transaction"}</p>
                        <p className="mt-1 text-xs text-white/45">{dateTimeLabel(transaction.createdAt)}</p>
                      </div>
                      <span className={transaction.type === "CREDIT" ? "text-emerald-200" : "text-rose-200"}>
                        {transaction.type === "CREDIT" ? "+" : "-"} INR {formatMoney(transaction.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ReceiptText, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toDateLocale } from "@/lib/date-locale";
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

export default function BusinessFundingPage() {
  const tBusiness = useTranslations("business");
  const t = useTranslations("business.funding");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [data, setData] = useState<FundingData | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function dateTimeLabel(value: string | null) {
    if (!value) return t("labels.notYet");
    return new Date(value).toLocaleString(dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    setData(parsed);
  }, [t]);

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
      setError(t("errors.gatewayLoadFailed"));
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
      payload = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(payload.error || t("errors.fundingFailed"));
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
      setError(t("errors.paymentInitFailed"));
      return;
    }

    const payment = new RazorpayCtor({
      key: payload.keyId,
      amount: payload.amountInPaise,
      currency: payload.currency || "INR",
      name: "EarnHub",
      description: t("labels.topUpDescription"),
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
          verifyData = { error: t("errors.unexpectedServerResponse") };
        }

        if (!verifyRes.ok) {
          setError(verifyData.error || t("errors.verifyFailed"));
          return;
        }

        setMessage(verifyData.message || t("messages.walletFunded"));
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
      payload = { error: t("errors.unexpectedServerResponse") };
    }

    setRefundLoading(false);

    if (!res.ok) {
      setError(payload.error || t("errors.refundFailed"));
      return;
    }

    setMessage(payload.message || t("messages.refundInitiated"));
    setRefundAmount("");
    emitDashboardLiveRefresh();
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">{t("loading")}</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("header.eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{tBusiness("fundingPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          {t("header.subtitle")}
        </p>
      </div>

      {data.wallet.balance < minFundingThreshold ? (
        <SectionCard className="border-amber-400/20 bg-amber-500/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-amber-200" />
                <div>
                  <p className="font-medium text-amber-100">{t("lowBalance.title")}</p>
                  <p className="text-sm text-amber-100/75">
                    {t("lowBalance.body", { threshold: formatMoney(minFundingThreshold) })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-amber-100/80">{t("lowBalance.hint")}</p>
            </div>
          </SectionCard>
        ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.availableWallet")} value={`INR ${formatMoney(data.wallet.balance)}`} tone="success" />
        <KpiCard label={t("kpis.lockedBudget")} value={`INR ${formatMoney(data.wallet.lockedBudget)}`} tone="info" />
        <KpiCard label={t("kpis.totalFunded")} value={`INR ${formatMoney(data.wallet.totalFunded)}`} />
        <div className="surface-card premium-ring-hover flex min-h-[108px] flex-col justify-between rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{t("kpis.lastSuccessfulPayment")}</p>
          <p className="kpi-value text-lg font-semibold text-foreground">{dateTimeLabel(data.stats.lastPaidAt)}</p>
          <StatusBadge
            label={data.stats.lastPaidAt ? t("kpis.paid") : t("kpis.noPayment")}
            tone={data.stats.lastPaidAt ? "success" : "neutral"}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard elevated>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <ArrowUpCircle className="text-emerald-200" size={18} />
                <div>
                  <p className="text-sm text-white/60">{t("topUp.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("topUp.title")}</h3>
                </div>
              </div>

            <div className="flex flex-wrap gap-2">
              {presets.map((value) => (
                <Button key={value} variant="outline" onClick={() => setFundAmount(String(value))} className="flex-1 sm:flex-none">
                  INR {formatMoney(value)}
                </Button>
              ))}
            </div>

            <Input
              type="number"
              min={minFundingThreshold}
              placeholder={t("topUp.amountPlaceholder", { min: formatMoney(minFundingThreshold) })}
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between gap-3">
                <span>{t("topUp.breakdown.gross")}</span>
                <span className="text-right">INR {formatMoney(fundNumber)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>{t("topUp.breakdown.fee", { rate: (feeRate * 100).toFixed(2) })}</span>
                <span className="text-right">INR {formatMoney(fundFee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 font-medium text-emerald-200">
                <span>{t("topUp.breakdown.net")}</span>
                <span className="text-right">INR {formatMoney(fundNet)}</span>
              </div>
            </div>

            <Button onClick={() => void submitFunding()} disabled={loading || fundNumber < minFundingThreshold} className="w-full">
              {loading ? t("topUp.initializing") : t("topUp.payAndFund")}
            </Button>
          </CardContent>
        </SectionCard>

        <SectionCard elevated>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <ArrowDownCircle className="text-sky-200" size={18} />
                <div>
                  <p className="text-sm text-white/60">{t("refund.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("refund.title")}</h3>
                </div>
              </div>

            <Input
              type="number"
              min="1"
              max={Math.floor(data.wallet.balance)}
              placeholder={t("refund.amountPlaceholder")}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between gap-3">
                <span>{t("refund.breakdown.requested")}</span>
                <span className="text-right">INR {formatMoney(refundNumber)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>{t("refund.breakdown.fee", { rate: (feeRate * 100).toFixed(2) })}</span>
                <span className="text-right">INR {formatMoney(refundFee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 font-medium text-sky-200">
                <span>{t("refund.breakdown.net")}</span>
                <span className="text-right">INR {formatMoney(refundNet)}</span>
              </div>
            </div>

            <Button
              onClick={() => void submitRefund()}
              disabled={refundLoading || refundNumber <= 0 || refundNumber > data.wallet.balance}
              variant="outline"
              className="w-full"
            >
              {refundLoading ? t("refund.processing") : t("refund.request")}
            </Button>

            <p className="text-xs text-white/45">
              {t("refund.help")}
            </p>
          </CardContent>
        </SectionCard>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard elevated>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <ReceiptText size={18} className="text-white/75" />
                <div>
                  <p className="text-sm text-white/60">{t("orders.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("orders.title")}</h3>
                </div>
              </div>

            {data.paymentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                {t("orders.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.paymentOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-white">INR {formatMoney(order.amount)}</p>
                            <p className="mt-1 break-all text-xs text-white/45">{t("orders.receipt", { receipt: order.receipt })}</p>
                          </div>
                      <span className={`text-sm font-medium ${orderTone(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-white/50">
                      <p>{t("orders.created", { date: dateTimeLabel(order.createdAt) })}</p>
                      <p>{t("orders.paid", { date: dateTimeLabel(order.paidAt) })}</p>
                      <p>{t("orders.providerOrder", { id: order.providerOrderId || "-" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SectionCard>

        <SectionCard elevated>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <Wallet size={18} className="text-white/75" />
                <div>
                  <p className="text-sm text-white/60">{t("ledger.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("ledger.title")}</h3>
                </div>
              </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                {t("ledger.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-white break-words">{transaction.note || t("ledger.fallbackNote")}</p>
                        <p className="mt-1 text-xs text-white/45">{dateTimeLabel(transaction.createdAt)}</p>
                      </div>
                      <span className={transaction.type === "CREDIT" ? "text-emerald-200 sm:text-right" : "text-rose-200 sm:text-right"}>
                        {transaction.type === "CREDIT" ? "+" : "-"} INR {formatMoney(transaction.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SectionCard>
      </div>
    </div>
  );
}

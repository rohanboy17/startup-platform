"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  MessageCircle,
  Phone,
  ReceiptText,
  Share2,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import ProofImageDialog from "@/components/proof-image-dialog";
import { formatMoney } from "@/lib/format-money";
import {
  buildBusinessFundingUpiLink,
  generateFundingReferenceId,
} from "@/lib/manual-business-funding";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type FundingStatus = "PENDING" | "APPROVED" | "REJECTED";

type FundingData = {
  wallet: {
    balance: number;
    totalFunded: number;
    totalSpent: number;
    totalRefund: number;
    lockedBudget: number;
  };
  config: {
    minFundingThreshold: number;
    upiId: string;
    upiName: string;
    phoneNumber: string;
    whatsappNumber: string;
    manualFundingEnabled: boolean;
    canManageBilling: boolean;
    fundingFeeRate: number;
    businessRefundFeeRate: number;
  };
  requests: Array<{
    id: string;
    amount: number;
    referenceId: string;
    utr: string | null;
    proofImage: string;
    status: FundingStatus;
    flaggedReason: string | null;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  refundRequests: Array<{
    id: string;
    amount: number;
    requestNote: string | null;
    status: FundingStatus;
    flaggedReason: string | null;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  refundableBalance: number;
  transactions: Array<{
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    note: string | null;
    createdAt: string;
  }>;
  stats: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    pendingRefundCount: number;
  };
  error?: string;
};

type SubmitFundingResponse = {
  message?: string;
  error?: string;
  whatsappLink?: string | null;
  flaggedReason?: string | null;
};

type FundingTranslations = ReturnType<typeof useTranslations<"business.manualFunding">>;

function fundingTone(status: FundingStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

function fundingTextTone(status: FundingStatus) {
  if (status === "APPROVED") return "text-emerald-300";
  if (status === "REJECTED") return "text-rose-300";
  return "text-amber-200";
}

function resolveIntlLocale(locale: string) {
  if (locale === "hi") return "hi-IN";
  if (locale === "bn") return "bn-IN";
  return "en-IN";
}

function formatDateTime(
  value: string | null | undefined,
  locale: string,
  fallback: string
) {
  if (!value) return fallback;
  return new Date(value).toLocaleString(resolveIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fundingStatusLabel(status: FundingStatus, t: FundingTranslations) {
  if (status === "APPROVED") return t("status.approved");
  if (status === "REJECTED") return t("status.rejected");
  return t("status.pending");
}

export default function BusinessFundingPage() {
  const t = useTranslations("business.manualFunding");
  const locale = useLocale();
  const [data, setData] = useState<FundingData | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const [refundError, setRefundError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/funding", { credentials: "include" });
    const raw = await res.text();
    let parsed: FundingData = {
      wallet: { balance: 0, totalFunded: 0, totalSpent: 0, totalRefund: 0, lockedBudget: 0 },
      config: {
        minFundingThreshold: 500,
        upiId: "",
        upiName: "FreeEarnHub",
        phoneNumber: "",
        whatsappNumber: "",
        manualFundingEnabled: false,
        canManageBilling: false,
        fundingFeeRate: 0,
        businessRefundFeeRate: 0.03,
      },
      requests: [],
      refundRequests: [],
      refundableBalance: 0,
      transactions: [],
      stats: { pendingCount: 0, approvedCount: 0, rejectedCount: 0, pendingRefundCount: 0 },
    };

    try {
      parsed = raw ? (JSON.parse(raw) as FundingData) : parsed;
    } catch {
      setError(t("errors.loadUnexpected"));
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

  const presets = useMemo(() => [500, 1000, 2500, 5000, 10000], []);
  const minFundingThreshold = data?.config.minFundingThreshold ?? 500;
  const fundNumber = Number(fundAmount) || 0;
  const canManageBilling = data?.config.canManageBilling ?? false;
  const businessRefundFeeRate = data?.config.businessRefundFeeRate ?? 0.03;
  const canGenerateReference =
    Boolean(data?.config.manualFundingEnabled) && canManageBilling && fundNumber >= minFundingThreshold;
  const refundNumber = Number(refundAmount) || 0;
  const refundFee = Number((refundNumber * businessRefundFeeRate).toFixed(2));
  const refundNet = Number((refundNumber - refundFee).toFixed(2));
  const upiLink =
    data?.config.upiId && referenceId && fundNumber > 0
      ? buildBusinessFundingUpiLink({
          upiId: data.config.upiId,
          upiName: data.config.upiName,
          amount: fundNumber,
          referenceId,
        })
      : null;
  const openPayLabel = data?.config.upiId?.includes("@paytm")
    ? t("actions.openPaytm")
    : t("actions.openUpi");
  const stepItems = useMemo(
    () => [
      t("steps.item1"),
      t("steps.item2"),
      t("steps.item3"),
      t("steps.item4"),
      t("steps.item5"),
    ],
    [t]
  );

  useEffect(() => {
    let active = true;

    async function renderQr() {
      if (!upiLink) {
        setQrDataUrl(null);
        return;
      }

      try {
        const QRCode = await import("qrcode");
        const next = await QRCode.toDataURL(upiLink, {
          width: 320,
          margin: 1,
          color: {
            dark: "#020617",
            light: "#ffffff",
          },
        });

        if (active) {
          setQrDataUrl(next);
        }
      } catch {
        if (active) {
          setQrDataUrl(null);
        }
      }
    }

    void renderQr();

    return () => {
      active = false;
    };
  }, [upiLink]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(t("messages.copied"));
    } catch {
      setError(t("errors.copyFailed"));
    }
  }

  async function shareQrDetails() {
    setMessage("");
    setError("");

    if (!qrDataUrl || !upiLink || !referenceId) {
      setError(t("errors.generateBeforeShare"));
      return;
    }

    const shareText = `${t("share.title")}\n${t("share.amount", { amount: `INR ${formatMoney(fundNumber)}` })}\n${t("share.reference", { referenceId })}\n${t("share.upi", { upiId: data?.config.upiId ?? "" })}`;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${referenceId}-funding-qr.png`, { type: blob.type || "image/png" });

      if (navigator.share) {
        if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: t("share.sheetTitle"),
            text: shareText,
            files: [file],
          });
        } else {
          await navigator.share({
            title: t("share.sheetTitle"),
            text: `${shareText}\n${upiLink}`,
            url: upiLink,
          });
        }
        setMessage(t("messages.qrShared"));
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${upiLink}`);
      setMessage(t("messages.shareFallback"));
    } catch {
      setError(t("errors.shareFailed"));
    }
  }

  function downloadQrCode() {
    setMessage("");
    setError("");

    if (!qrDataUrl || !referenceId) {
      setError(t("errors.generateBeforeDownload"));
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${referenceId}-funding-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage(t("messages.qrDownloaded"));
    } catch {
      setError(t("errors.downloadFailed"));
    }
  }

  function generatePaymentDetails() {
    setMessage("");
    setError("");
    setWhatsappLink(null);

    if (!data?.config.manualFundingEnabled) {
      setError(t("errors.manualFundingDisabled"));
      return;
    }

    if (fundNumber < minFundingThreshold) {
      setError(t("errors.minimumFunding", { amount: `INR ${formatMoney(minFundingThreshold)}` }));
      return;
    }

    setReferenceId(generateFundingReferenceId());
  }

  async function uploadProofImage(file: File) {
    setUploadError("");
    setUploading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1440,
        useWebWorker: true,
        fileType: "image/webp",
      });

      if (compressed.size > 500 * 1024) {
        throw new Error(t("errors.imageTooLarge"));
      }

      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/upload-proof", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const raw = await res.text();
      let parsed: { url?: string; error?: string } = {};
      try {
        parsed = raw ? (JSON.parse(raw) as { url?: string; error?: string }) : {};
      } catch {
        parsed = { error: t("errors.uploadUnexpected") };
      }

      if (!res.ok || !parsed.url) {
        throw new Error(parsed.error || t("errors.uploadFailed"));
      }

      setProofImageUrl(parsed.url);
    } catch (uploadError) {
      setProofImageUrl(null);
      setUploadError(
        uploadError instanceof Error ? uploadError.message : t("errors.uploadFailed")
      );
    } finally {
      setUploading(false);
    }
  }

  async function submitFundingRequest() {
    setMessage("");
    setError("");
    setWhatsappLink(null);

    if (!referenceId) {
      setError(t("errors.generateBeforeSubmit"));
      return;
    }

    if (!proofImageUrl) {
      setError(t("errors.uploadBeforeVerify"));
      return;
    }

    setLoading(true);

    const res = await fetch("/api/business/funding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amount: fundNumber,
        referenceId,
        utr: utr.trim() || undefined,
        proofImage: proofImageUrl,
      }),
    });

    const raw = await res.text();
    let parsed: SubmitFundingResponse = {};
    try {
      parsed = raw ? (JSON.parse(raw) as SubmitFundingResponse) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(parsed.error || t("errors.submitFundingFailed"));
      return;
    }

    setMessage(parsed.message || t("messages.fundingSubmitted"));
    setWhatsappLink(parsed.whatsappLink || null);
    setFundAmount("");
    setUtr("");
    setReferenceId("");
    setProofImageUrl(null);
    setQrDataUrl(null);
    emitDashboardLiveRefresh();
    void load();
  }

  async function submitRefundRequest() {
    setRefundError("");
    setRefundMessage("");

    if (refundNumber <= 0) {
      setRefundError(t("errors.invalidRefundAmount"));
      return;
    }

    if (refundNumber > (data?.refundableBalance ?? 0)) {
      setRefundError(t("errors.refundTooHigh"));
      return;
    }

    setRefundLoading(true);

    const res = await fetch("/api/v2/business/wallet/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: refundNumber }),
    });

    const raw = await res.text();
    let parsed: { message?: string; error?: string; fee?: number; netRefund?: number } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string; fee?: number; netRefund?: number }) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }

    setRefundLoading(false);

    if (!res.ok) {
      setRefundError(parsed.error || t("errors.submitRefundFailed"));
      return;
    }

    setRefundMessage(parsed.message || t("messages.refundSubmitted"));
    setRefundAmount("");
    emitDashboardLiveRefresh();
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-emerald-500/12 via-background to-cyan-500/10 p-6 shadow-[0_30px_90px_-45px_rgba(16,185,129,0.35)] sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)] 2xl:block" />
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-400/70">{t("hero.eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("hero.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/70 md:text-base">
          {t("hero.description")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            {t("hero.chip1")}
          </div>
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            {t("hero.chip2")}
          </div>
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            {t("hero.chip3")}
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 backdrop-blur dark:text-emerald-200">
            {t("hero.chip4")}
          </div>
        </div>
      </div>

      {!data.config.manualFundingEnabled ? (
        <SectionCard className="border-amber-400/20 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-300" size={18} />
            <div className="space-y-1">
              <p className="font-medium text-amber-100">{t("notConfigured.title")}</p>
              <p className="text-sm text-amber-100/80">
                {t("notConfigured.body")}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {!canManageBilling ? (
        <SectionCard className="border-sky-400/20 bg-sky-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-sky-300" size={18} />
            <div className="space-y-1">
              <p className="font-medium text-sky-100">{t("ownerOnlyBanner.title")}</p>
              <p className="text-sm text-sky-100/80">
                {t("ownerOnlyBanner.body")}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.availableWallet")} value={`INR ${formatMoney(data.wallet.balance)}`} tone="success" />
        <KpiCard label={t("kpis.lockedBudget")} value={`INR ${formatMoney(data.wallet.lockedBudget)}`} tone="warning" />
        <KpiCard label={t("kpis.approvedFunding")} value={data.stats.approvedCount} tone="info" />
        <KpiCard label={t("kpis.waitingReview")} value={data.stats.pendingCount} tone="warning" />
      </div>

      <SectionCard elevated>
        <CardContent className="space-y-5 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-400/70">{t("pricing.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("pricing.title")}</h3>
              <p className="mt-2 max-w-3xl text-sm text-foreground/65">
                {t("pricing.description")}
              </p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {t("pricing.launchModel")}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-500/12 via-background/95 to-background/85 p-5 shadow-inner shadow-emerald-400/5">
              <p className="text-sm text-foreground/60">{t("pricing.addFundFeeLabel")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{(data.config.fundingFeeRate * 100).toFixed(2)}%</p>
              <p className="mt-2 text-sm text-foreground/60">{t("pricing.addFundFeeHelp")}</p>
              <p className="mt-4 inline-flex rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                {t("pricing.liveNow")}
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/12 via-background/95 to-background/85 p-5 shadow-inner shadow-cyan-400/5">
              <p className="text-sm text-foreground/60">{t("pricing.refundFeeLabel")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {(businessRefundFeeRate * 100).toFixed(2)}%
              </p>
              <p className="mt-2 text-sm text-foreground/60">{t("pricing.refundFeeHelp")}</p>
              <p className="mt-4 inline-flex rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                {t("pricing.manualReview")}
              </p>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-background/55 p-5">
              <p className="text-sm font-medium text-foreground">{t("pricing.usageTitle")}</p>
              <div className="mt-3 space-y-3 text-sm text-foreground/65">
                <p>{t("pricing.usageBody1")}</p>
                <p>{t("pricing.usageBody2")}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/55">
                {t("pricing.usageNote")}
              </div>
            </div>
          </div>
        </CardContent>
      </SectionCard>

      <div className="grid gap-6 min-[1800px]:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]">
        <SectionCard elevated>
          <CardContent className="space-y-6 p-0">
            <div className="grid gap-6 min-[1800px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground/60">{t("steps.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-foreground">{t("steps.title")}</h3>
                </div>

                <div className="grid gap-3">
                  {stepItems.map((step, index) => (
                    <div
                      key={step}
                      className="flex gap-3 rounded-2xl border border-foreground/10 bg-background/50 p-4"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-500 dark:text-emerald-300">
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground/75">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 rounded-[1.75rem] border border-foreground/10 bg-gradient-to-br from-background/80 via-background/70 to-emerald-500/5 p-5 shadow-[0_24px_60px_-40px_rgba(16,185,129,0.45)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                  <p className="text-sm text-foreground/60">{t("generator.eyebrow")}</p>
                  <h3 className="text-xl font-semibold text-foreground">{t("generator.title")}</h3>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t("generator.ownerOnly")}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                  {presets.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      onClick={() => setFundAmount(String(preset))}
                      className="w-full"
                    >
                      INR {formatMoney(preset)}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    type="number"
                    min={minFundingThreshold}
                    step="0.01"
                    placeholder={t("generator.amountPlaceholder", {
                      amount: `INR ${formatMoney(minFundingThreshold)}`,
                    })}
                    value={fundAmount}
                    onChange={(event) => setFundAmount(event.target.value)}
                    disabled={!canManageBilling}
                  />

                  <Button
                    type="button"
                    onClick={generatePaymentDetails}
                    disabled={!canGenerateReference}
                    className="w-full lg:w-auto"
                  >
                    {t("generator.button")}
                  </Button>
                </div>

                {referenceId ? (
                  <div className="space-y-4 rounded-3xl border border-foreground/10 bg-background/55 p-4 md:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("details.referenceId")}</p>
                        <div className="mt-2 flex flex-col gap-3">
                          <p className="break-all text-xl font-semibold text-foreground">{referenceId}</p>
                          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void copyText(referenceId)}>
                            <Copy size={14} />
                            {t("actions.copy")}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("details.upiId")}</p>
                        <div className="mt-2 flex flex-col gap-3">
                          <p className="break-all text-base font-medium text-foreground">{data.config.upiId}</p>
                          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void copyText(data.config.upiId)}>
                            <Copy size={14} />
                            {t("actions.copy")}
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-foreground/55">{t("details.accountName", { name: data.config.upiName })}</p>
                      </div>

                      {data.config.phoneNumber ? (
                        <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4 sm:col-span-2">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("details.phoneNumber")}</p>
                              <p className="text-base font-medium text-foreground">{data.config.phoneNumber}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full md:w-auto"
                              onClick={() => void copyText(data.config.phoneNumber)}
                            >
                              <Phone size={14} />
                              {t("actions.copy")}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[1.75rem] border border-foreground/10 bg-gradient-to-b from-background/90 to-background/70 p-5 shadow-[0_24px_70px_-45px_rgba(16,185,129,0.35)]">
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("details.scanAndPay")}</p>
                        <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-6 text-foreground/70">
                          {t("details.scanHelpBefore")} <span className="font-semibold text-foreground">{referenceId}</span> {t("details.scanHelpAfter")}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-center">
                        {qrDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrDataUrl}
                            alt={t("details.qrAlt")}
                            className="h-60 w-60 rounded-[1.75rem] bg-white p-4 shadow-xl shadow-black/15"
                          />
                        ) : (
                          <div className="flex h-60 w-60 items-center justify-center rounded-[1.75rem] border border-dashed border-foreground/15 bg-background/60 px-4 text-center text-sm text-foreground/55">
                            {t("details.qrPending")}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {upiLink ? (
                          <a
                            href={upiLink}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-200"
                          >
                            {openPayLabel}
                          </a>
                        ) : (
                          <div />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={downloadQrCode}
                          disabled={!qrDataUrl}
                        >
                          {t("actions.downloadQr")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => void shareQrDetails()}
                          disabled={!qrDataUrl}
                        >
                          <Share2 size={16} />
                          {t("actions.shareQr")}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-100">
                      {t("details.tip")}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard elevated>
          <CardContent className="space-y-5 p-0">
            <div>
              <p className="text-sm text-foreground/60">{t("verification.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("verification.title")}</h3>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/70">
              {t("verification.description")}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("verification.utrLabel")}</label>
                <Input
                  placeholder={t("verification.utrPlaceholder")}
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  disabled={!canManageBilling}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("verification.uploadLabel")}</label>
                <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadProofImage(file);
                      }
                    }}
                    className="block w-full text-sm text-foreground/75 file:mr-4 file:rounded-lg file:border-0 file:bg-foreground/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-foreground/15"
                    disabled={uploading || !canManageBilling}
                  />
                  <p className="mt-2 text-xs text-foreground/55">
                    {t("verification.uploadHelp")}
                  </p>
                  {uploading ? <p className="mt-2 text-xs text-emerald-300">{t("verification.uploading")}</p> : null}
                  {uploadError ? <p className="mt-2 text-xs text-rose-300">{uploadError}</p> : null}
                  {proofImageUrl ? (
                    <div className="mt-3 rounded-2xl border border-foreground/10 bg-background/65 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofImageUrl}
                        alt={t("verification.previewAlt")}
                        className="w-full rounded-xl border border-foreground/10 object-contain"
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-foreground/60">{t("verification.ready")}</p>
                        <button
                          type="button"
                          className="text-xs font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
                          onClick={() => setProofImageUrl(null)}
                        >
                          {t("verification.remove")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={loading || uploading || !referenceId || !proofImageUrl || !canManageBilling}
              onClick={() => void submitFundingRequest()}
            >
              <Upload size={16} />
              {loading ? t("verification.submitting") : t("verification.verifyButton")}
            </Button>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            {whatsappLink ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-emerald-100">{t("whatsapp.title")}</p>
                      <p className="mt-1 text-sm text-emerald-100/80">
                        {t("whatsapp.description")}
                      </p>
                    </div>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
                    >
                      <MessageCircle size={16} />
                      {t("whatsapp.button")}
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border-t border-foreground/10 pt-5">
              <div className="rounded-[1.75rem] border border-foreground/10 bg-gradient-to-br from-background/80 via-background/70 to-cyan-500/5 p-5 shadow-[0_24px_60px_-40px_rgba(6,182,212,0.35)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">{t("refund.eyebrow")}</p>
                    <h3 className="text-xl font-semibold text-foreground">{t("refund.title")}</h3>
                  </div>
                  <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                    {businessRefundFeeRate === 0
                      ? t("refund.zeroFee")
                      : t("refund.feeBadge", { rate: (businessRefundFeeRate * 100).toFixed(2) })}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/70">
                  {t("refund.descriptionBefore")}{" "}
                  <span className="font-semibold text-foreground">{(businessRefundFeeRate * 100).toFixed(2)}%</span>.
                  {businessRefundFeeRate === 0
                    ? ` ${t("refund.descriptionZeroFee")}`
                    : ` ${t("refund.descriptionWithFee")}`}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-700/80 dark:text-cyan-100/80">{t("refund.cards.refundFee")}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {(businessRefundFeeRate * 100).toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">{t("refund.cards.refundFeeHelp")}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("refund.cards.refundPolicy")}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/65">
                      {t("refund.cards.refundPolicyHelp")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t("refund.amountPlaceholder", {
                      amount: `INR ${formatMoney(data.refundableBalance)}`,
                    })}
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    disabled={!canManageBilling || refundLoading}
                  />

                  <Button
                    type="button"
                    onClick={() => void submitRefundRequest()}
                    disabled={!canManageBilling || refundLoading || refundNumber <= 0 || refundNumber > data.refundableBalance}
                    className="w-full lg:w-auto"
                    variant="outline"
                  >
                    {refundLoading ? t("refund.processing") : t("refund.button")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("refund.breakdown.refundableBalance")}</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(data.refundableBalance)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("refund.breakdown.requested")}</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(refundNumber || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("refund.breakdown.walletFee")}</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(refundFee)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">{t("refund.breakdown.netRefund")}</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(refundNet > 0 ? refundNet : 0)}</p>
                  </div>
                </div>

                {refundError ? <p className="mt-4 text-sm text-rose-300">{refundError}</p> : null}
                {refundMessage ? <p className="mt-4 text-sm text-emerald-300">{refundMessage}</p> : null}
              </div>
            </div>
          </CardContent>
        </SectionCard>
      </div>

      <div className="grid gap-6 min-[1700px]:grid-cols-[1.06fr_0.94fr]">
        <SectionCard elevated>
          <CardContent className="space-y-4 p-0">
            <div className="flex items-center gap-3">
              <ReceiptText size={18} className="text-foreground/70" />
              <div>
                <p className="text-sm text-foreground/60">{t("history.eyebrow")}</p>
                <h3 className="text-xl font-semibold text-foreground">{t("history.title")}</h3>
              </div>
            </div>

            {data.requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
                {t("history.empty")}
              </div>
            ) : (
              <div className="space-y-4">
                {data.requests.map((request) => (
                  <div key={request.id} className="rounded-3xl border border-foreground/10 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                        <p className="text-sm text-foreground/65">{t("history.referenceId", { referenceId: request.referenceId })}</p>
                        {request.utr ? (
                          <p className="text-xs text-foreground/55">{t("history.utr", { utr: request.utr })}</p>
                        ) : null}
                        <p className="text-xs text-foreground/55">
                          {formatDateTime(request.createdAt, locale, t("labels.notAvailable"))}
                        </p>
                      </div>
                      <StatusBadge
                        label={fundingStatusLabel(request.status, t)}
                        tone={fundingTone(request.status)}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        {request.flaggedReason ? (
                          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100">
                            {t("history.reviewFlag", { reason: request.flaggedReason })}
                          </div>
                        ) : null}
                        {request.reviewNote ? (
                          <div className="rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                            {t("history.adminNote", { note: request.reviewNote })}
                          </div>
                        ) : null}
                        {request.reviewedAt ? (
                          <p className={`text-xs ${fundingTextTone(request.status)}`}>
                            {t("history.reviewed", {
                              date: formatDateTime(request.reviewedAt, locale, t("labels.notAvailable")),
                            })}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <ProofImageDialog
                          url={request.proofImage}
                          label={t("actions.openScreenshot")}
                          title={t("history.proofTitle")}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SectionCard>

        <SectionCard elevated>
          <CardContent className="space-y-4 p-0">
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-foreground/70" />
              <div>
                <p className="text-sm text-foreground/60">{t("walletActivity.eyebrow")}</p>
                <h3 className="text-xl font-semibold text-foreground">{t("walletActivity.title")}</h3>
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
                {t("walletActivity.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground break-words">
                          {transaction.note || t("walletActivity.fallbackNote")}
                        </p>
                        <p className="mt-1 text-xs text-foreground/55">
                          {formatDateTime(transaction.createdAt, locale, t("labels.notAvailable"))}
                        </p>
                      </div>
                      <p
                        className={
                          transaction.type === "CREDIT"
                            ? "font-semibold text-emerald-300 sm:text-right"
                            : "font-semibold text-rose-300 sm:text-right"
                        }
                      >
                        {transaction.type === "CREDIT" ? "+" : "-"} INR {formatMoney(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SectionCard>
      </div>

      <SectionCard elevated>
        <CardContent className="space-y-4 p-0">
          <div className="flex items-center gap-3">
            <Wallet size={18} className="text-foreground/70" />
            <div>
              <p className="text-sm text-foreground/60">{t("refundHistory.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("refundHistory.title")}</h3>
            </div>
          </div>

          {data.refundRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
              {t("refundHistory.empty")}
            </div>
          ) : (
            <div className="space-y-4">
              {data.refundRequests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-foreground/10 bg-background/55 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                      <p className="text-xs text-foreground/55">
                        {formatDateTime(request.createdAt, locale, t("labels.notAvailable"))}
                      </p>
                    </div>
                    <StatusBadge
                      label={fundingStatusLabel(request.status, t)}
                      tone={fundingTone(request.status)}
                    />
                  </div>

                  {request.requestNote ? (
                    <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                      {t("refundHistory.requestNote", { note: request.requestNote })}
                    </div>
                  ) : null}

                  {request.flaggedReason ? (
                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100">
                      {t("refundHistory.reviewFlag", { reason: request.flaggedReason })}
                    </div>
                  ) : null}

                  {request.reviewNote ? (
                    <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                      {t("refundHistory.adminNote", { note: request.reviewNote })}
                    </div>
                  ) : null}

                  {request.reviewedAt ? (
                    <p className={`mt-4 text-xs ${fundingTextTone(request.status)}`}>
                      {t("refundHistory.reviewed", {
                        date: formatDateTime(request.reviewedAt, locale, t("labels.notAvailable")),
                      })}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </SectionCard>
    </div>
  );
}

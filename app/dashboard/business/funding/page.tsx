"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
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
      setError("Unexpected server response while loading funding details.");
      return;
    }

    if (!res.ok) {
      setError(parsed.error || "Unable to load funding details.");
      return;
    }

    setError("");
    setData(parsed);
  }, []);

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
    ? "Open Paytm / UPI app"
    : "Open UPI app";

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
      setMessage("Copied to clipboard.");
    } catch {
      setError("Unable to copy right now. Please copy it manually.");
    }
  }

  async function shareQrDetails() {
    setMessage("");
    setError("");

    if (!qrDataUrl || !upiLink || !referenceId) {
      setError("Generate the payment details first so the QR can be shared.");
      return;
    }

    const shareText = `FreeEarnHub wallet funding\nAmount: INR ${formatMoney(fundNumber)}\nReference ID: ${referenceId}\nUPI ID: ${data?.config.upiId ?? ""}`;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${referenceId}-funding-qr.png`, { type: blob.type || "image/png" });

      if (navigator.share) {
        if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "FreeEarnHub funding QR",
            text: shareText,
            files: [file],
          });
        } else {
          await navigator.share({
            title: "FreeEarnHub funding QR",
            text: `${shareText}\n${upiLink}`,
            url: upiLink,
          });
        }
        setMessage("Payment QR shared.");
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${upiLink}`);
      setMessage("Share is not available on this device. Payment details were copied instead.");
    } catch {
      setError("Unable to share the QR right now.");
    }
  }

  function downloadQrCode() {
    setMessage("");
    setError("");

    if (!qrDataUrl || !referenceId) {
      setError("Generate the payment details first so the QR can be downloaded.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${referenceId}-funding-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("QR downloaded.");
    } catch {
      setError("Unable to download the QR right now.");
    }
  }

  function generatePaymentDetails() {
    setMessage("");
    setError("");
    setWhatsappLink(null);

    if (!data?.config.manualFundingEnabled) {
      setError("Manual funding is not configured yet. Add UPI or phone details first.");
      return;
    }

    if (fundNumber < minFundingThreshold) {
      setError(`Minimum funding amount is INR ${formatMoney(minFundingThreshold)}.`);
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
        throw new Error("Image must stay under 500 KB after compression.");
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
        parsed = { error: "Unexpected upload response" };
      }

      if (!res.ok || !parsed.url) {
        throw new Error(parsed.error || "Unable to upload the screenshot.");
      }

      setProofImageUrl(parsed.url);
    } catch (uploadError) {
      setProofImageUrl(null);
      setUploadError(
        uploadError instanceof Error ? uploadError.message : "Unable to upload the screenshot."
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
      setError("Generate the payment details first so we can track this funding request.");
      return;
    }

    if (!proofImageUrl) {
      setError("Upload your payment screenshot before verification.");
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
      parsed = { error: "Unexpected server response" };
    }

    setLoading(false);

    if (!res.ok) {
      setError(parsed.error || "Funding request could not be submitted.");
      return;
    }

    setMessage(parsed.message || "Funding request submitted.");
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
      setRefundError("Enter a valid refund amount.");
      return;
    }

    if (refundNumber > (data?.refundableBalance ?? 0)) {
      setRefundError("Refund amount cannot be more than your currently refundable wallet balance.");
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
      parsed = { error: "Unexpected server response" };
    }

    setRefundLoading(false);

    if (!res.ok) {
      setRefundError(parsed.error || "Refund request could not be submitted.");
      return;
    }

    setRefundMessage(parsed.message || "Refund request submitted.");
    setRefundAmount("");
    emitDashboardLiveRefresh();
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">Loading funding dashboard...</p>;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-emerald-500/12 via-background to-cyan-500/10 p-6 shadow-[0_30px_90px_-45px_rgba(16,185,129,0.35)] sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)] 2xl:block" />
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-400/70">Manual business funding</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Add funds using QR, UPI, or phone payment</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/70 md:text-base">
          We are using a manual payment review flow for now. Pay using the details below, upload the receipt, and our team will credit the wallet after verification.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            Manual admin review
          </div>
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            Reference ID tracked
          </div>
          <div className="rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
            Screenshot required
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 backdrop-blur dark:text-emerald-200">
            0% add-fund fee
          </div>
        </div>
      </div>

      {!data.config.manualFundingEnabled ? (
        <SectionCard className="border-amber-400/20 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-300" size={18} />
            <div className="space-y-1">
              <p className="font-medium text-amber-100">Manual funding is not configured yet</p>
              <p className="text-sm text-amber-100/80">
                Add the funding UPI ID or phone number in the environment first, then this payment flow will be available for businesses.
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
              <p className="font-medium text-sky-100">Billing actions are limited to the business owner</p>
              <p className="text-sm text-sky-100/80">
                You can review the funding history here, but only the business owner can submit a new wallet funding request.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Available wallet" value={`INR ${formatMoney(data.wallet.balance)}`} tone="success" />
        <KpiCard label="Locked budget" value={`INR ${formatMoney(data.wallet.lockedBudget)}`} tone="warning" />
        <KpiCard label="Approved funding" value={data.stats.approvedCount} tone="info" />
        <KpiCard label="Waiting review" value={data.stats.pendingCount} tone="warning" />
      </div>

      <SectionCard elevated>
        <CardContent className="space-y-5 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-400/70">Wallet pricing</p>
              <h3 className="text-xl font-semibold text-foreground">Business wallet fee structure</h3>
              <p className="mt-2 max-w-3xl text-sm text-foreground/65">
                Top-ups stay free during launch. Refunds use the reviewed refund fee so the rules stay clear before you submit any wallet movement.
              </p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Launch model
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-500/12 via-background/95 to-background/85 p-5 shadow-inner shadow-emerald-400/5">
              <p className="text-sm text-foreground/60">Add-fund fee</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{(data.config.fundingFeeRate * 100).toFixed(2)}%</p>
              <p className="mt-2 text-sm text-foreground/60">Applied on wallet top-ups. Currently waived during launch.</p>
              <p className="mt-4 inline-flex rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                Live now
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/12 via-background/95 to-background/85 p-5 shadow-inner shadow-cyan-400/5">
              <p className="text-sm text-foreground/60">Refund fee</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {(businessRefundFeeRate * 100).toFixed(2)}%
              </p>
              <p className="mt-2 text-sm text-foreground/60">Applied only when a refund request is approved after review.</p>
              <p className="mt-4 inline-flex rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                Manual review
              </p>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-background/55 p-5">
              <p className="text-sm font-medium text-foreground">How to use these fees</p>
              <div className="mt-3 space-y-3 text-sm text-foreground/65">
                <p>Use add-fund when you want to increase campaign budget quickly with QR or UPI payment.</p>
                <p>Use refund when you want approved unused wallet balance moved back out after admin review.</p>
              </div>
              <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/55">
                The funding and refund cards below follow the same pricing model shown here.
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
                  <p className="text-sm text-foreground/60">Funding steps</p>
                  <h3 className="text-xl font-semibold text-foreground">Complete payment in 5 clear steps</h3>
                </div>

                <div className="grid gap-3">
                  {[
                    "Enter the amount you want to add.",
                    "Generate payment details to create a unique reference ID.",
                    "Pay using the QR code, UPI ID, or phone number and add the reference ID in the note.",
                    "Upload the payment screenshot and add UTR if available.",
                    "Click verify, then send the receipt on WhatsApp for faster review.",
                  ].map((step, index) => (
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
                  <p className="text-sm text-foreground/60">Start funding</p>
                  <h3 className="text-xl font-semibold text-foreground">Generate payment details</h3>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Owner only
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
                    placeholder={`Enter amount (min INR ${formatMoney(minFundingThreshold)})`}
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
                    Generate payment details
                  </Button>
                </div>

                {referenceId ? (
                  <div className="space-y-4 rounded-3xl border border-foreground/10 bg-background/55 p-4 md:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Reference ID</p>
                        <div className="mt-2 flex flex-col gap-3">
                          <p className="break-all text-xl font-semibold text-foreground">{referenceId}</p>
                          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void copyText(referenceId)}>
                            <Copy size={14} />
                            Copy
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">UPI ID</p>
                        <div className="mt-2 flex flex-col gap-3">
                          <p className="break-all text-base font-medium text-foreground">{data.config.upiId}</p>
                          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void copyText(data.config.upiId)}>
                            <Copy size={14} />
                            Copy
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-foreground/55">Account name: {data.config.upiName}</p>
                      </div>

                      {data.config.phoneNumber ? (
                        <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4 sm:col-span-2">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Phone number</p>
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
                              Copy
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[1.75rem] border border-foreground/10 bg-gradient-to-b from-background/90 to-background/70 p-5 shadow-[0_24px_70px_-45px_rgba(16,185,129,0.35)]">
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Scan and pay</p>
                        <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-6 text-foreground/70">
                          Pay the exact amount and add <span className="font-semibold text-foreground">{referenceId}</span> in the note.
                        </p>
                      </div>

                      <div className="mt-4 flex justify-center">
                        {qrDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrDataUrl}
                            alt="Business funding QR code"
                            className="h-60 w-60 rounded-[1.75rem] bg-white p-4 shadow-xl shadow-black/15"
                          />
                        ) : (
                          <div className="flex h-60 w-60 items-center justify-center rounded-[1.75rem] border border-dashed border-foreground/15 bg-background/60 px-4 text-center text-sm text-foreground/55">
                            QR code will appear after payment details are generated.
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
                          Download QR
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => void shareQrDetails()}
                          disabled={!qrDataUrl}
                        >
                          <Share2 size={16} />
                          Share QR
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-100">
                      Keep the screenshot clear and readable. If possible, write the reference ID in the note so our review team can approve it faster.
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
              <p className="text-sm text-foreground/60">Receipt verification</p>
              <h3 className="text-xl font-semibold text-foreground">Upload screenshot and send for approval</h3>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/70">
              After payment, upload the screenshot here. We review each request manually before the wallet is credited.
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">UTR / transaction ID (optional)</label>
                <Input
                  placeholder="Add the UTR if your payment app shows it"
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  disabled={!canManageBilling}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Upload payment screenshot</label>
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
                    One screenshot only. JPG, PNG, or WEBP. Max 500 KB after compression.
                  </p>
                  {uploading ? <p className="mt-2 text-xs text-emerald-300">Uploading screenshot...</p> : null}
                  {uploadError ? <p className="mt-2 text-xs text-rose-300">{uploadError}</p> : null}
                  {proofImageUrl ? (
                    <div className="mt-3 rounded-2xl border border-foreground/10 bg-background/65 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofImageUrl}
                        alt="Funding proof preview"
                        className="w-full rounded-xl border border-foreground/10 object-contain"
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-foreground/60">Screenshot ready for verification.</p>
                        <button
                          type="button"
                          className="text-xs font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
                          onClick={() => setProofImageUrl(null)}
                        >
                          Remove screenshot
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
              {loading ? "Submitting..." : "Verify payment"}
            </Button>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            {whatsappLink ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-emerald-100">Funding request sent for review</p>
                      <p className="mt-1 text-sm text-emerald-100/80">
                        Send the receipt on WhatsApp for faster manual verification.
                      </p>
                    </div>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
                    >
                      <MessageCircle size={16} />
                      Send receipt to WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border-t border-foreground/10 pt-5">
              <div className="rounded-[1.75rem] border border-foreground/10 bg-gradient-to-br from-background/80 via-background/70 to-cyan-500/5 p-5 shadow-[0_24px_60px_-40px_rgba(6,182,212,0.35)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">Request refund</p>
                    <h3 className="text-xl font-semibold text-foreground">Move unused wallet balance out</h3>
                  </div>
                  <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                    {businessRefundFeeRate === 0 ? "0% fee" : `${(businessRefundFeeRate * 100).toFixed(2)}% fee`}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/70">
                  Refund requests use the business refund fee setting. Right now the refund fee is{" "}
                  <span className="font-semibold text-foreground">{(businessRefundFeeRate * 100).toFixed(2)}%</span>.
                  {businessRefundFeeRate === 0
                    ? " Your full requested amount is returned."
                    : " The amount after the fee is shown below before you submit."}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-700/80 dark:text-cyan-100/80">Refund fee</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {(businessRefundFeeRate * 100).toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">Applied after admin approval of the refund request.</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Refund policy</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/65">
                      Request only from currently refundable wallet balance. The net amount preview stays visible before you submit.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Enter refund amount (max INR ${formatMoney(data.refundableBalance)})`}
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
                    {refundLoading ? "Processing..." : "Request refund"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Refundable balance</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(data.refundableBalance)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Requested</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(refundNumber || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Wallet fee</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(refundFee)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/55">Net refund</p>
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
                <p className="text-sm text-foreground/60">Recent funding requests</p>
                <h3 className="text-xl font-semibold text-foreground">Track approval status</h3>
              </div>
            </div>

            {data.requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
                No manual funding request yet.
              </div>
            ) : (
              <div className="space-y-4">
                {data.requests.map((request) => (
                  <div key={request.id} className="rounded-3xl border border-foreground/10 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                        <p className="text-sm text-foreground/65">Reference ID: {request.referenceId}</p>
                        {request.utr ? (
                          <p className="text-xs text-foreground/55">UTR: {request.utr}</p>
                        ) : null}
                        <p className="text-xs text-foreground/55">{formatDateTime(request.createdAt)}</p>
                      </div>
                      <StatusBadge label={request.status} tone={fundingTone(request.status)} />
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        {request.flaggedReason ? (
                          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100">
                            Review flag: {request.flaggedReason}
                          </div>
                        ) : null}
                        {request.reviewNote ? (
                          <div className="rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                            Admin note: {request.reviewNote}
                          </div>
                        ) : null}
                        {request.reviewedAt ? (
                          <p className={`text-xs ${fundingTextTone(request.status)}`}>
                            Reviewed: {formatDateTime(request.reviewedAt)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <ProofImageDialog
                          url={request.proofImage}
                          label="Open screenshot"
                          title="Funding proof screenshot"
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
                <p className="text-sm text-foreground/60">Wallet activity</p>
                <h3 className="text-xl font-semibold text-foreground">Funding credits and debits</h3>
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
                No wallet activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground break-words">
                          {transaction.note || "Business wallet update"}
                        </p>
                        <p className="mt-1 text-xs text-foreground/55">{formatDateTime(transaction.createdAt)}</p>
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
              <p className="text-sm text-foreground/60">Refund requests</p>
              <h3 className="text-xl font-semibold text-foreground">Track refund approval status</h3>
            </div>
          </div>

          {data.refundRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/55 p-5 text-sm text-foreground/60">
              No refund request yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data.refundRequests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-foreground/10 bg-background/55 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                      <p className="text-xs text-foreground/55">{formatDateTime(request.createdAt)}</p>
                    </div>
                    <StatusBadge label={request.status} tone={fundingTone(request.status)} />
                  </div>

                  {request.requestNote ? (
                    <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                      Request note: {request.requestNote}
                    </div>
                  ) : null}

                  {request.flaggedReason ? (
                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100">
                      Review flag: {request.flaggedReason}
                    </div>
                  ) : null}

                  {request.reviewNote ? (
                    <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/65 p-3 text-xs text-foreground/70">
                      Admin note: {request.reviewNote}
                    </div>
                  ) : null}

                  {request.reviewedAt ? (
                    <p className={`mt-4 text-xs ${fundingTextTone(request.status)}`}>
                      Reviewed: {formatDateTime(request.reviewedAt)}
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

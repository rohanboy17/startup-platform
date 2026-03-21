"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Send, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CampaignTutorialVideo from "@/components/campaign-tutorial-video";
import { normalizeExternalUrl } from "@/lib/external-url";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";
import { formatMoney } from "@/lib/format-money";
import { getEffectiveTaskLabel } from "@/lib/task-categories";
import imageCompression from "browser-image-compression";

type CampaignResponse = {
  campaign?: {
    id: string;
    title: string;
    description: string;
    category: string;
    taskCategory: string;
    taskType: string;
    customTask: string | null;
    taskLink: string | null;
    tutorialVideoUrl: string | null;
    rewardPerTask: number;
    totalBudget: number;
    remainingBudget: number;
    status: string;
    allowedSubmissions: number;
    usedSubmissions: number;
    leftSubmissions: number;
    userSubmissionCount: number;
    submissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
    blockedBySubmissionMode: boolean;
    blockedByRepeatRule: boolean;
    repeatAccessMode:
      | "OPEN"
      | "REQUESTED_ONLY"
      | "REQUESTED_PLUS_NEW"
      | "FRESH_CAMPAIGN_ONLY"
      | "FRESH_PLATFORM_ONLY";
    repeatRequestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
    canRequestTomorrow: boolean;
    repeatRequestReason: string | null;
    isAvailable: boolean;
    instructions: Array<{
      id: string;
      instructionText: string;
      sequence: number;
    }>;
    currentInstruction: {
      id: string;
      instructionText: string;
      sequence: number;
    } | null;
  };
  error?: string;
};

function relativeStatusText(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  isAvailable: boolean,
  leftSubmissions: number
) {
  if (!isAvailable && leftSubmissions <= 0) return t("statusAllOccupied");
  if (!isAvailable) return t("statusNotAccepting");
  return t("statusSlotsLeft", {
    count: leftSubmissions,
    plural: leftSubmissions === 1 ? "" : "s",
  });
}

export default function UserCampaignDetailPanel({ campaignId }: { campaignId: string }) {
  const t = useTranslations("user.taskDetail");
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [error, setError] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [repeatRequestMessage, setRepeatRequestMessage] = useState("");
  const [requestingTomorrow, setRequestingTomorrow] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/v2/campaigns/${campaignId}/submissions`, { credentials: "include" });
    const raw = await res.text();
    let parsed: CampaignResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as CampaignResponse) : null;
    } catch {
      setError(t("unexpected"));
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || t("failed"));
      setData(null);
      return;
    }

    setError("");
    setData(parsed);
  }, [campaignId, t]);

  useLiveRefresh(load, 10000);

  const uploadProofImage = async (file: File) => {
    setUploadError("");
    setUploading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: "image/webp",
      });

      if (compressed.size > 500 * 1024) {
        throw new Error(t("proofImageTooLarge"));
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
        parsed = { error: t("unexpected") };
      }

      if (!res.ok) {
        throw new Error(parsed.error || t("proofImageUploadFailed"));
      }

      if (!parsed.url) {
        throw new Error(t("proofImageUploadFailed"));
      }

      setProofImageUrl(parsed.url);
    } catch (err) {
      setProofImageUrl(null);
      setUploadError(err instanceof Error ? err.message : t("proofImageUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!proofLink.trim() && !proofText.trim() && !proofImageUrl) {
      setSubmitMessage(t("addProof"));
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    const res = await fetch(`/api/v2/campaigns/${campaignId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        proofLink: proofLink.trim() || undefined,
        proofText: proofText.trim() || undefined,
        proofImage: proofImageUrl || undefined,
      }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: t("unexpected") };
    }

    setSubmitting(false);

    if (!res.ok) {
      setSubmitMessage(parsed.error || t("submissionFailed"));
      return;
    }

    setProofLink("");
    setProofText("");
    setProofImageUrl(null);
    setSubmitMessage(parsed.message || t("sent"));
    emitDashboardLiveRefresh();
    await load();
  };

  const requestTomorrow = async () => {
    setRequestingTomorrow(true);
    setRepeatRequestMessage("");

    const res = await fetch(`/api/v2/campaigns/${campaignId}/repeat-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: t("unexpected") };
    }

    setRequestingTomorrow(false);

    if (!res.ok) {
      setRepeatRequestMessage(parsed.error || t("repeatRequestFailed"));
      return;
    }

    setRepeatRequestMessage(parsed.message || t("repeatRequestSent"));
    emitDashboardLiveRefresh();
    await load();
  };

  const copyInstruction = async (instructionText: string) => {
    try {
      await navigator.clipboard.writeText(instructionText);
      setCopyMessage(t("instructionCopied"));
    } catch {
      setCopyMessage(t("instructionCopyFailed"));
    }

    window.setTimeout(() => setCopyMessage(""), 1800);
  };

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!data?.campaign) {
    return <p className="text-sm text-white/60">{t("loading")}</p>;
  }

  const { campaign } = data;
  const effectiveTaskLabel = getEffectiveTaskLabel(campaign.taskType, campaign.customTask);
  const fillRate = campaign.allowedSubmissions > 0
    ? Math.max(0, Math.min(100, Math.round((campaign.usedSubmissions / campaign.allowedSubmissions) * 100)))
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/user/tasks" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
            <ArrowLeft size={16} />
            {t("back")}
          </Link>
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{campaign.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">{campaign.description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            {campaign.category}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            {campaign.taskCategory} | {effectiveTaskLabel}
          </div>
          {campaign.taskLink ? (
            <a
              href={normalizeExternalUrl(campaign.taskLink) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <ExternalLink size={16} />
              {t("taskLink")}
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("kpiReward")}</p>
            <p className="text-3xl font-semibold text-emerald-300">INR {formatMoney(campaign.rewardPerTask)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("kpiSlotsLeft")}</p>
            <p className="text-3xl font-semibold text-white">{campaign.leftSubmissions}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("kpiUsedAllowed")}</p>
            <p className="text-3xl font-semibold text-white">{campaign.usedSubmissions} / {campaign.allowedSubmissions}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("kpiYourSubmissions")}</p>
            <p className="text-3xl font-semibold text-violet-200">{campaign.userSubmissionCount}</p>
            <p className="text-xs text-white/50">
              {campaign.submissionMode === "ONE_PER_USER"
                ? t("onePerUser")
                : t("manyPerUser")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">{t("detailsEyebrow")}</p>
              <h3 className="text-xl font-semibold text-white">{t("detailsTitle")}</h3>
            </div>

            {campaign.currentInstruction ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/70">
                    {t("currentDetail", { sequence: campaign.currentInstruction.sequence })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyInstruction(campaign.currentInstruction?.instructionText || "")}
                    className="w-full sm:w-auto"
                  >
                    <Copy size={16} />
                    {t("copyInstruction")}
                  </Button>
                </div>
                <p className="mt-3 text-sm text-white/90 break-words">
                  {campaign.currentInstruction.instructionText}
                </p>
                {copyMessage ? <p className="mt-3 text-xs text-emerald-100">{copyMessage}</p> : null}
              </div>
            ) : null}

            {campaign.instructions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                {t("noVariants")}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{t("assignmentTitle")}</p>
                <p className="mt-1 text-sm text-white/55">
                  {t("assignmentBody")}
                </p>
              </div>
            )}

            {campaign.tutorialVideoUrl ? (
              <CampaignTutorialVideo
                videoUrl={campaign.tutorialVideoUrl}
                eyebrow={t("tutorialEyebrow")}
                title={t("tutorialTitle")}
                body={t("tutorialBody")}
                openLabel={t("openTutorial")}
              />
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <span>{t("fillRate")}</span>
                <span>{fillRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-sky-400" style={{ width: `${fillRate}%` }} />
              </div>
              <p className="mt-2 text-xs text-white/50">
                {relativeStatusText(t, campaign.isAvailable, campaign.leftSubmissions)}
              </p>
            </div>

            {campaign.submissionMode === "MULTIPLE_PER_USER" ? (
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-sky-200/75">
                  {t("repeatRequestEyebrow")}
                </p>
                <p className="mt-3 text-sm text-white/85">
                  {campaign.repeatAccessMode === "REQUESTED_ONLY"
                    ? t("repeatRuleRequestedOnly")
                    : campaign.repeatAccessMode === "REQUESTED_PLUS_NEW"
                      ? t("repeatRuleRequestedPlusNew")
                      : campaign.repeatAccessMode === "FRESH_CAMPAIGN_ONLY"
                        ? t("repeatRuleFreshCampaignOnly")
                        : campaign.repeatAccessMode === "FRESH_PLATFORM_ONLY"
                          ? t("repeatRuleFreshPlatformOnly")
                      : t("repeatRuleOpen")}
                </p>
                {campaign.repeatRequestStatus ? (
                  <p className="mt-2 text-xs text-white/60">
                    {campaign.repeatRequestStatus === "PENDING"
                      ? t("repeatStatusPending")
                      : campaign.repeatRequestStatus === "APPROVED"
                        ? t("repeatStatusApproved")
                        : t("repeatStatusRejected")}
                  </p>
                ) : null}
                {campaign.canRequestTomorrow ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/60">{t("repeatRequestBody")}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void requestTomorrow()}
                      disabled={requestingTomorrow || campaign.repeatRequestStatus === "PENDING"}
                    >
                      <Send size={16} />
                      {requestingTomorrow ? t("repeatRequestSending") : t("repeatRequestCta")}
                    </Button>
                  </div>
                ) : campaign.userSubmissionCount > 0 ? (
                  <p className="mt-4 text-xs text-white/60">
                    {campaign.repeatRequestStatus === "PENDING"
                      ? t("repeatAlreadyPending")
                      : campaign.repeatRequestReason === "fresh_same_campaign_only"
                        ? t("repeatFreshCampaignOnly")
                        : campaign.repeatRequestReason === "fresh_platform_only"
                          ? t("repeatFreshPlatformOnly")
                      : t("repeatRequestWait")}
                  </p>
                ) : null}
                {repeatRequestMessage ? (
                  <p className="mt-3 text-xs text-sky-100">{repeatRequestMessage}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">{t("submitEyebrow")}</p>
              <h3 className="text-xl font-semibold text-white">{t("submitTitle")}</h3>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/85">
              <div className="flex items-start gap-3">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <p>
                  {t("proofWarning")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">{t("proofLinkLabel")}</label>
                <Input
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder={t("proofLinkPlaceholder")}
                  className="min-h-11 border-white/15 bg-black/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">{t("proofImageLabel")}</label>
                <div className="rounded-md border border-foreground/15 bg-background/70 p-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const next = e.target.files?.[0];
                      if (next) uploadProofImage(next);
                    }}
                    className="block w-full text-sm text-foreground/75 file:mr-4 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground file:transition hover:file:bg-foreground/15"
                    disabled={uploading}
                  />
                  <p className="mt-2 text-xs text-foreground/60">{t("proofImageHelp")}</p>
                  {uploading ? (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-200">{t("proofImageUploading")}</p>
                  ) : null}
                  {uploadError ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{uploadError}</p>
                  ) : null}
                  {proofImageUrl ? (
                    <div className="mt-3 rounded-lg border border-foreground/10 bg-background/80 p-3">
                      <p className="text-xs text-foreground/60">{t("proofImageReady")}</p>
                      <a
                        href={proofImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all text-xs text-emerald-700 underline underline-offset-4 dark:text-emerald-200"
                      >
                        {proofImageUrl}
                      </a>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofImageUrl}
                        alt="Uploaded proof screenshot preview"
                        className="mt-3 w-full rounded-lg border border-foreground/10 object-contain"
                      />
                      <button
                        type="button"
                        className="mt-3 text-xs text-foreground/70 underline underline-offset-4 hover:text-foreground"
                        onClick={() => setProofImageUrl(null)}
                      >
                        {t("proofImageRemove")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">{t("proofDetailsLabel")}</label>
                <textarea
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder={t("proofDetailsPlaceholder")}
                  className="min-h-[140px] w-full rounded-md border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-white/30"
                />
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || uploading || !campaign.isAvailable}
              className="w-full bg-white text-black hover:bg-white"
            >
              {submitting
                ? t("submitting")
                : campaign.isAvailable
                  ? t("submitForReview")
                  : t("submissionUnavailable")}
            </Button>

            {campaign.blockedBySubmissionMode ? (
              <p className="text-sm text-amber-200">
                {t("blocked")}
              </p>
            ) : null}
            {submitMessage ? <p className="text-sm text-white/65">{submitMessage}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

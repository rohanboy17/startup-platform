"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { normalizeExternalUrl } from "@/lib/external-url";
import { useLiveRefresh } from "@/lib/live-refresh";
import ManagerSubmissionActions from "@/components/manager-submission-actions";
import ProofImageDialog from "@/components/proof-image-dialog";

type QueueItem = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  proofImage: string | null;
  assignedInstructionSequence: number | null;
  assignedInstructionText: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    isSuspicious: boolean;
    suspiciousReason: string | null;
  };
  campaign: {
    id: string;
    title: string;
    category: string;
    rewardPerTask: number;
    description: string;
    taskLink: string | null;
    instructions: Array<{ sequence: number; instructionText: string }>;
  } | null;
};

type QueueResponse = {
  submissions?: QueueItem[];
  error?: string;
};

type QueueFilter = "ALL" | "SUSPICIOUS" | "HIGH_LEVEL";

type Translator = (key: string, values?: Record<string, string | number>) => string;

function waitLabel(value: string, t: Translator) {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return t("wait.minutes", { count: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("wait.hours", { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t("wait.days", { count: diffDays });
}

function proofPreview(item: QueueItem, t: Translator) {
  if (item.proofText) return item.proofText;
  if (item.proofLink) return item.proofLink;
  if (item.proofImage) return t("proof.screenshotUploaded");
  return item.proof || t("proof.noContent");
}

export default function ManagerSubmissionQueuePanel() {
  const t = useTranslations("manager.queuePanel");
  const [data, setData] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/submissions", { credentials: "include" });
    const raw = await res.text();
    let parsed: QueueResponse = {};

    try {
      parsed = raw ? (JSON.parse(raw) as QueueResponse) : {};
    } catch {
      setError(t("errors.unexpected"));
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed.error || t("errors.failed"));
    } else {
      setError("");
      setData(parsed.submissions || []);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  const stats = useMemo(() => {
    const suspicious = data.filter((item) => item.user.isSuspicious).length;
    const highLevel = data.filter((item) => ["L4", "L5"].includes(item.user.level)).length;
    return {
      total: data.length,
      suspicious,
      highLevel,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "SUSPICIOUS"
            ? item.user.isSuspicious
            : ["L4", "L5"].includes(item.user.level);

      const matchesSearch = query
        ? [
            item.campaign?.title,
            item.campaign?.category,
            item.campaign?.description,
            item.campaign?.instructions?.map((row) => row.instructionText).join(" "),
            item.user.name,
            proofPreview(item, t),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;

      return matchesFilter && matchesSearch;
    });
  }, [data, filter, search, t]);

  const visibleRows = useMemo(
    () => (limit === "ALL" ? filtered : filtered.slice(0, Number(limit))),
    [filtered, limit]
  );

  const filters: Array<{ value: QueueFilter; label: string }> = [
    { value: "ALL", label: t("filters.all") },
    { value: "SUSPICIOUS", label: t("filters.suspicious") },
    { value: "HIGH_LEVEL", label: t("filters.highLevel") },
  ];

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label={t("kpis.totalInReview")} value={stats.total} />
        <KpiCard label={t("kpis.flaggedSubmissions")} value={stats.suspicious} tone="warning" />
        <KpiCard label={t("kpis.highLevelUsers")} value={stats.highLevel} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-foreground/60">{t("filters.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("filters.title")}</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-foreground/60">
                <span>{t("filters.show")}</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
                  className="rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="ALL">{t("filters.showAll")}</option>
                </select>
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-foreground/35 lg:max-w-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {filters.map((item) => {
                const active = filter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm transition ${
                      active
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                        : "border-foreground/10 bg-background/60 text-foreground/65 hover:bg-background/80 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-foreground/10 bg-background/50">
          <CardContent className="p-6 text-sm text-foreground/60">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleRows.map((submission) => (
            <Card key={submission.id} className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground break-words">
                      {submission.campaign?.title || t("fallbacks.submission")}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {submission.campaign?.category || t("fallbacks.uncategorized")} | {t("reward", { amount: formatMoney(submission.campaign?.rewardPerTask) })}
                    </p>
                  </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <span>{waitLabel(submission.createdAt, t)}</span>
                    <StatusBadge label={submission.user.level} tone="neutral" />
                    {submission.user.isSuspicious ? (
                      <StatusBadge label={t("filters.suspicious")} tone="warning" />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 min-[1450px]:grid-cols-[0.72fr_1.28fr]">
                  <div className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-foreground/35">{t("user.title")}</p>
                    <p className="text-sm text-foreground/80 break-words">
                      {submission.user.name || t("fallbacks.unnamedUser")}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {t("user.approvedRejected", {
                        approved: submission.user.totalApproved,
                        rejected: submission.user.totalRejected,
                      })}
                    </p>
                    {submission.user.isSuspicious ? (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100/85">
                        <div className="flex items-start gap-2">
                          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                          <p className="break-words">
                            {submission.user.suspiciousReason || t("user.flaggedFallback")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    {submission.campaign ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs uppercase tracking-[0.16em] text-foreground/35">{t("task.title")}</p>
                          {submission.campaign.taskLink ? (
                            <a
                              href={normalizeExternalUrl(submission.campaign.taskLink) ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-emerald-700 underline underline-offset-4 dark:text-emerald-200"
                            >
                              <ExternalLink size={14} />
                              {t("task.openTaskLink")}
                            </a>
                          ) : null}
                        </div>

                        <p className="text-sm text-foreground/80 break-words">{submission.campaign.description}</p>

                        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/70">
                            {t("task.assignedInstruction")}
                          </p>
                          {submission.assignedInstructionText ? (
                            <div className="mt-2 space-y-2">
                              <span className="inline-flex rounded-full border border-emerald-300/20 px-2 py-1 text-xs text-emerald-100/80">
                                {t("task.assignedInstructionSequence", {
                                  sequence: submission.assignedInstructionSequence ?? 0,
                                })}
                              </span>
                              <p className="text-sm text-emerald-50/90 break-words">
                                {submission.assignedInstructionText}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-emerald-50/70">
                              {t("task.assignedInstructionFallback")}
                            </p>
                          )}
                        </div>

                        {submission.campaign.instructions?.length ? (
                          <details className="rounded-2xl border border-foreground/10 bg-background/60 p-3">
                            <summary className="cursor-pointer text-sm text-foreground/70">
                              {t("task.viewSteps", { count: submission.campaign.instructions.length })}
                            </summary>
                            <div className="mt-3 space-y-2 text-sm text-foreground/75">
                              {submission.campaign.instructions.map((row) => (
                                <div key={row.sequence} className="flex gap-3">
                                  <span className="mt-0.5 shrink-0 rounded-full border border-foreground/10 px-2 py-0.5 text-xs text-foreground/60">
                                    {row.sequence}
                                  </span>
                                  <span className="break-words">{row.instructionText}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <p className="text-sm text-foreground/55">{t("task.noSteps")}</p>
                        )}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs uppercase tracking-[0.16em] text-foreground/35">{t("proof.title")}</p>
                      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                        {submission.proofLink ? (
                          <a
                            href={normalizeExternalUrl(submission.proofLink) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center gap-1 text-sm text-emerald-700 underline underline-offset-4 dark:text-emerald-200 lg:w-auto"
                          >
                            <ExternalLink size={14} />
                            {t("proof.openProof")}
                          </a>
                        ) : null}
                        {submission.proofImage ? (
                          <ProofImageDialog url={submission.proofImage} label={t("proof.previewScreenshot")} />
                        ) : null}
                      </div>
                    </div>
                    <div className="max-h-56 overflow-auto rounded-2xl border border-foreground/10 bg-background/60 p-3">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
                        {proofPreview(submission, t)}
                      </p>
                    </div>
                    {!submission.proofLink && !submission.proofText && !submission.proofImage ? (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100/85">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          <p>{t("proof.onlyTextWarning")}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <ManagerSubmissionActions submissionId={submission.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

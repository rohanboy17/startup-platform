"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ProofImageDialog from "@/components/proof-image-dialog";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { toDateLocale } from "@/lib/date-locale";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type SubmissionStage =
  | "PENDING_MANAGER"
  | "PENDING_ADMIN"
  | "APPROVED"
  | "MANAGER_REJECTED"
  | "ADMIN_REJECTED";

type SubmissionRow = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  proofImage: string | null;
  managerStatus: string;
  adminStatus: string;
  rewardAmount: number;
  createdAt: string;
  stage: SubmissionStage;
  reason: string | null;
  campaign: {
    id: string;
    title: string;
    category: string;
    rewardPerTask: number;
  } | null;
  user: {
    name: string | null;
  };
};

type BusinessSubmissionsResponse = {
  counts: {
    total: number;
    pendingManager: number;
    pendingAdmin: number;
    approved: number;
    rejected: number;
  };
  submissions: SubmissionRow[];
  error?: string;
};

function stageTone(stage: SubmissionStage) {
  if (stage === "APPROVED") return "bg-emerald-400/15 text-emerald-200 border-emerald-400/20";
  if (stage === "PENDING_MANAGER" || stage === "PENDING_ADMIN") {
    return "bg-amber-400/15 text-amber-100 border-amber-400/20";
  }
  return "bg-rose-400/15 text-rose-100 border-rose-400/20";
}

function isLikelyScreenshotUrl(value: string | null | undefined) {
  if (!value) return false;
  if (!/^https:\/\//i.test(value)) return false;
  if (value.includes("res.cloudinary.com") && value.includes("/task_proofs/")) return true;
  return /\.(webp|png|jpe?g)$/i.test(value);
}

export default function BusinessSubmissionsPanel() {
  const t = useTranslations("business.submissionsPanel");
  const tCategories = useTranslations("business.categories");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [data, setData] = useState<BusinessSubmissionsResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | SubmissionStage>("ALL");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const FILTERS: Array<{ value: "ALL" | SubmissionStage; label: string }> = [
    { value: "ALL", label: t("filters.all") },
    { value: "PENDING_MANAGER", label: t("filters.pendingManager") },
    { value: "PENDING_ADMIN", label: t("filters.pendingAdmin") },
    { value: "APPROVED", label: t("filters.approved") },
    { value: "MANAGER_REJECTED", label: t("filters.managerRejected") },
    { value: "ADMIN_REJECTED", label: t("filters.adminRejected") },
  ];

  function stageLabel(stage: SubmissionStage) {
    switch (stage) {
      case "PENDING_MANAGER":
        return t("stages.pendingManager");
      case "PENDING_ADMIN":
        return t("stages.pendingAdmin");
      case "APPROVED":
        return t("stages.approved");
      case "MANAGER_REJECTED":
        return t("stages.managerRejected");
      default:
        return t("stages.adminRejected");
    }
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/submissions", { credentials: "include" });
    const raw = await res.text();
    let parsed: BusinessSubmissionsResponse = {
      counts: { total: 0, pendingManager: 0, pendingAdmin: 0, approved: 0, rejected: 0 },
      submissions: [],
    };
    try {
      parsed = raw ? (JSON.parse(raw) as BusinessSubmissionsResponse) : parsed;
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

  const filtered = useMemo(() => {
    const rows = data?.submissions || [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === "ALL" ? true : row.stage === filter;
      const matchesQuery = !q
        ? true
        : [
            row.campaign?.title || "",
            row.user.name || "",
            row.proofText || "",
            row.proofLink || "",
            row.reason || "",
          ].some((value) => value.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [data, filter, query]);

  const visibleRows = useMemo(
    () => (limit === "ALL" ? filtered : filtered.slice(0, Number(limit))),
    [filtered, limit]
  );

  function exportCsv() {
    const header = [
      "Campaign",
      "Category",
      "User",
      "Stage",
      "Reward",
      "Submitted At",
      "Reason",
      "Proof",
      "Proof Image",
    ];

    const rows = filtered.map((item) => [
      item.campaign?.title || "",
      item.campaign?.category || "",
      item.user.name || "",
      stageLabel(item.stage),
      String(item.rewardAmount || item.campaign?.rewardPerTask || 0),
      item.createdAt,
      item.reason || "",
      item.proofText || item.proofLink || item.proof || "",
      item.proofImage || "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "business-submissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">{t("kpis.total")}</p><p className="mt-2 text-3xl font-semibold text-white">{data.counts.total}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">{t("kpis.pendingManager")}</p><p className="mt-2 text-3xl font-semibold text-amber-100">{data.counts.pendingManager}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">{t("kpis.pendingAdmin")}</p><p className="mt-2 text-3xl font-semibold text-amber-100">{data.counts.pendingAdmin}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">{t("kpis.approved")}</p><p className="mt-2 text-3xl font-semibold text-emerald-200">{data.counts.approved}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">{t("kpis.rejected")}</p><p className="mt-2 text-3xl font-semibold text-rose-200">{data.counts.rejected}</p></CardContent></Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/60">{t("header.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-white">{t("header.title")}</h3>
            </div>
            <Button type="button" variant="outline" onClick={exportCsv} className="w-full sm:w-auto">
              <Download size={16} />
              {t("header.exportCsv")}
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/60">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="ALL">Show all</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    filter === item.value
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-black/20 text-white/70 hover:bg-black/30 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 text-sm text-white/55">{t("empty")}</CardContent>
          </Card>
        ) : (
          visibleRows.map((submission) => (
            <Card key={submission.id} className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-white">{submission.campaign?.title || t("fallback.campaign")}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${stageTone(submission.stage)}`}>
                        {stageLabel(submission.stage)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {getCampaignCategoryLabel(submission.campaign?.category || "", tCategories)} | {t("row.reward", { amount: formatMoney(submission.rewardAmount || submission.campaign?.rewardPerTask || 0) })}
                    </p>
                  </div>
                  <p className="text-xs text-white/45">
                    {new Date(submission.createdAt).toLocaleString(dateLocale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("row.participant")}</p>
                    <p className="mt-2 text-sm text-white">{submission.user.name || t("fallback.unnamedUser")}</p>
                    <p className="text-xs text-white/45">{t("row.participantPrivacy")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("row.proof")}</p>
                    {(() => {
                      const screenshotUrl =
                        submission.proofImage || (isLikelyScreenshotUrl(submission.proof) ? submission.proof : null);
                      const proofText =
                        submission.proofText ||
                        submission.proofLink ||
                        (screenshotUrl ? t("row.screenshotUploaded") : null) ||
                        submission.proof ||
                        "";

                      return (
                        <>
                          <p className="mt-2 break-all text-sm text-white/75">{proofText}</p>
                          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                            {screenshotUrl ? (
                              <ProofImageDialog url={screenshotUrl} label={t("row.openScreenshot")} />
                            ) : null}
                            {submission.proofLink ? (
                              <a
                                href={submission.proofLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center gap-1 text-sm text-emerald-200 underline underline-offset-4 lg:w-auto"
                              >
                                <ExternalLink size={14} />
                                {t("openProof")}
                              </a>
                            ) : null}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {submission.reason ? (
                  <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-100/70">{t("row.reviewReason")}</p>
                    <p className="mt-2 text-sm text-rose-50">{submission.reason}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, PauseCircle, PlayCircle, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type JobStatus = "PENDING_REVIEW" | "OPEN" | "REJECTED" | "PAUSED" | "CLOSED" | "FILLED";

type Job = {
  id: string;
  title: string;
  description: string;
  jobCategory: string;
  jobType: string;
  customJobType: string | null;
  city: string;
  state: string;
  openings: number;
  payAmount: number;
  payUnit: string;
  status: JobStatus;
  createdAt: string;
  metrics: {
    totalApplications: number;
    applied: number;
    shortlisted: number;
    hired: number;
  };
};

function statusTone(status: JobStatus) {
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "OPEN") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PAUSED") return "warning";
  if (status === "FILLED") return "info";
  return "neutral";
}

export default function BusinessJobsPanel() {
  const t = useTranslations("business.jobsPanel");
  const locale = useLocale();
  const [accessRole, setAccessRole] = useState<"OWNER" | "EDITOR" | "VIEWER">("OWNER");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/jobs", { credentials: "include" });
    const raw = await res.text();
    let data: { accessRole?: "OWNER" | "EDITOR" | "VIEWER"; jobs?: Job[]; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: t("errors.unexpectedServerResponse") };
    }
    if (!res.ok) {
      setError(data.error || t("errors.failedToLoad"));
    } else {
      setError("");
      setAccessRole(data.accessRole || "OWNER");
      setJobs(data.jobs || []);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      pending: jobs.filter((job) => job.status === "PENDING_REVIEW").length,
      open: jobs.filter((job) => job.status === "OPEN").length,
      paused: jobs.filter((job) => job.status === "PAUSED").length,
      applicants: jobs.reduce((sum, job) => sum + job.metrics.totalApplications, 0),
    }),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "ALL" ? true : job.status === statusFilter;
      const matchesQuery = !q
        ? true
        : [job.title, job.description, job.city, job.state, job.jobCategory, job.jobType]
            .some((value) => value.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [jobs, query, statusFilter]);

  const canManage = accessRole === "OWNER" || accessRole === "EDITOR";

  async function runAction(jobId: string, action: "PAUSE" | "REOPEN" | "CLOSE" | "FILL") {
    setBusyAction(`${jobId}:${action}`);
    setMessage("");

    const res = await fetch(`/api/v2/business/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      credentials: "include",
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setBusyAction("");

    if (!res.ok) {
      setMessage(data.error || t("errors.actionFailed"));
      return;
    }

    setMessage(data.message || t("messages.jobUpdated"));
    emitDashboardLiveRefresh();
    void load();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.totalJobs")} value={stats.total} />
        <KpiCard label={t("kpis.pending")} value={stats.pending} tone="warning" />
        <KpiCard label={t("kpis.open")} value={stats.open} tone="success" />
        <KpiCard label={t("kpis.paused")} value={stats.paused} tone="warning" />
        <KpiCard label={t("kpis.applicants")} value={stats.applicants} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-foreground/60">{t("header.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("header.title")}</h3>
          </div>
          {canManage ? (
            <Link
              href="/dashboard/business/jobs/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-800 transition hover:bg-emerald-400/20 dark:text-emerald-100"
            >
              {t("header.createJob")}
              <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="border-foreground/20 bg-background/60 pl-10 text-foreground placeholder:text-foreground/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PENDING_REVIEW", "OPEN", "REJECTED", "PAUSED", "FILLED", "CLOSED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  statusFilter === filter
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                    : "border-foreground/10 bg-background/50 text-foreground/70 hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {filter === "ALL" ? t("filters.ALL") : t(`filters.${filter}`)}
              </button>
            ))}
          </div>
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-2">
        {filteredJobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-10 text-center text-foreground/60 2xl:col-span-2">
            {t("empty")}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10">
              <CardContent className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                      <StatusBadge label={t(`filters.${job.status}`)} tone={statusTone(job.status)} />
                    </div>
                    <p className="text-sm text-foreground/60">{job.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                      <span>{job.jobCategory}</span>
                      <span>{job.customJobType || job.jobType}</span>
                      <span>{job.city}, {job.state}</span>
                      <span>{new Date(job.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {canManage && job.status === "OPEN" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyAction === `${job.id}:PAUSE`}
                        onClick={() => void runAction(job.id, "PAUSE")}
                      >
                        <PauseCircle size={16} />
                        {t("actions.pause")}
                      </Button>
                    ) : null}
                    {canManage && job.status === "PAUSED" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyAction === `${job.id}:REOPEN`}
                        onClick={() => void runAction(job.id, "REOPEN")}
                      >
                        <PlayCircle size={16} />
                        {t("actions.reopen")}
                      </Button>
                    ) : null}
                    {canManage && !["FILLED", "CLOSED"].includes(job.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyAction === `${job.id}:CLOSE`}
                        onClick={() => void runAction(job.id, "CLOSE")}
                      >
                        <XCircle size={16} />
                        {t("actions.close")}
                      </Button>
                    ) : null}
                    <Link href={`/dashboard/business/jobs/${job.id}`}>
                      <Button type="button" variant="outline">
                        {t("actions.view")}
                      </Button>
                    </Link>
                  </div>
                </div>
                {["PENDING_REVIEW", "REJECTED"].includes(job.status) ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
                    {job.status === "PENDING_REVIEW" ? t("messages.awaitingAdminReview") : t("messages.rejectedByAdmin")}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("card.pay")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      INR {formatMoney(job.payAmount)}
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">{job.payUnit}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("card.workerPayout")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      INR {formatMoney(getPhysicalWorkPayoutBreakdown(job.payAmount).workerAmount)}
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">{t("card.platformCut")}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("card.openings")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{job.openings}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("card.applications")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{job.metrics.totalApplications}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("card.hired")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{job.metrics.hired}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

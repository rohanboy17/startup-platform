"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type Job = {
  id: string;
  title: string;
  description: string;
  businessName: string;
  jobCategory: string;
  jobType: string;
  customJobType: string | null;
  workMode: string;
  employmentType: string;
  city: string;
  state: string;
  pincode: string | null;
  addressLine: string | null;
  openings: number;
  payAmount: number;
  payUnit: string;
  shiftSummary: string | null;
  startDate: string | null;
  applicationDeadline: string | null;
  requiredSkills: string[];
  requiredLanguages: string[];
  minEducation: string | null;
  createdAt: string;
  applicationCount: number;
  applicationStatus:
    | "APPLIED"
    | "SHORTLISTED"
    | "INTERVIEW_SCHEDULED"
    | "REJECTED"
    | "HIRED"
    | "JOINED"
    | null;
  matchScore: number;
  matchReasons: string[];
  matchedSkills: string[];
  matchedLanguages: string[];
  latitude: number | null;
  longitude: number | null;
  hiringRadiusKm: number | null;
  distanceKm: number | null;
};

type ResponsePayload = {
  jobs: Job[];
  summary: {
    totalOpen: number;
    strongMatches: number;
    appliedCount: number;
    nearbyCount: number;
  };
  filters?: {
    city: string | null;
    radiusKm: number | null;
  };
  error?: string;
};

function applicationTone(status: Job["applicationStatus"]) {
  if (status === "HIRED" || status === "SHORTLISTED" || status === "JOINED") return "success";
  if (status === "INTERVIEW_SCHEDULED") return "info";
  if (status === "APPLIED") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export default function UserJobsPanel() {
  const t = useTranslations("user.jobs");
  const locale = useLocale();
  const [data, setData] = useState<ResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (cityFilter.trim()) params.set("city", cityFilter.trim());
    if (radiusFilter.trim()) params.set("radiusKm", radiusFilter.trim());
    const res = await fetch(`/api/v2/jobs${params.toString() ? `?${params.toString()}` : ""}`, { credentials: "include" });
    const raw = await res.text();
    let parsed: ResponsePayload = { jobs: [], summary: { totalOpen: 0, strongMatches: 0, appliedCount: 0, nearbyCount: 0 } };
    try {
      parsed = raw ? (JSON.parse(raw) as ResponsePayload) : parsed;
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
    } else {
      setError("");
      setData(parsed);
      if (!cityFilter && parsed.filters?.city) {
        setCityFilter(parsed.filters.city);
      }
    }
    setLoading(false);
  }, [cityFilter, radiusFilter, t]);

  useLiveRefresh(load, 10000);

  const filteredJobs = useMemo(() => {
    const jobs = data?.jobs || [];
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      [job.title, job.description, job.city, job.state, job.jobCategory, job.jobType, job.businessName]
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [data, query]);

  async function apply(jobId: string) {
    setBusyId(jobId);
    setMessage("");
    const res = await fetch(`/api/v2/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpectedServerResponse") };
    }
    setBusyId("");
    if (!res.ok) {
      setMessage(parsed.error || t("errors.applyFailed"));
      return;
    }
    setMessage(parsed.message || t("messages.applied"));
    void load();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.totalOpen")} value={data.summary.totalOpen} />
        <KpiCard label={t("kpis.strongMatches")} value={data.summary.strongMatches} tone="success" />
        <KpiCard label={t("kpis.applied")} value={data.summary.appliedCount} tone="warning" />
        <KpiCard label={t("kpis.nearby")} value={data.summary.nearbyCount} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("title")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("subtitle")}</p>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="border-foreground/20 bg-background/60 pl-10 text-foreground placeholder:text-foreground/50"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder={t("filters.city")}
            className="border-foreground/20 bg-background/60 text-foreground placeholder:text-foreground/50"
          />
          <select
            value={radiusFilter}
            onChange={(e) => setRadiusFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            <option value="">{t("filters.anyRadius")}</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
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
                      {job.applicationStatus ? (
                        <StatusBadge label={t(`applicationStatus.${job.applicationStatus}`)} tone={applicationTone(job.applicationStatus)} />
                      ) : null}
                    </div>
                    <p className="text-sm text-foreground/60">{job.businessName}</p>
                    <p className="text-sm text-foreground/70">{job.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                      <span>{job.jobCategory}</span>
                      <span>{job.customJobType || job.jobType}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.city}, {job.state}</span>
                      <span>{new Date(job.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
                    <p className="font-semibold">{t("matchScore", { score: job.matchScore })}</p>
                    {job.matchReasons.length > 0 ? (
                      <p className="mt-1 text-xs opacity-80">{job.matchReasons.join(" | ")}</p>
                    ) : (
                      <p className="mt-1 text-xs opacity-80">{t("noStrongMatchYet")}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.pay")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">INR {formatMoney(job.payAmount)}</p>
                    <p className="mt-1 text-xs text-foreground/60">{t(`payUnits.${job.payUnit}`)}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.openings")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{job.openings}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.workMode")}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{t(`workModes.${job.workMode}`)}</p>
                    {typeof job.distanceKm === "number" ? (
                      <p className="mt-1 text-xs text-foreground/60">{t("distance", { value: job.distanceKm })}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.employmentType")}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{t(`employmentTypes.${job.employmentType}`)}</p>
                    {job.hiringRadiusKm ? (
                      <p className="mt-1 text-xs text-foreground/60">{t("radius", { value: job.hiringRadiusKm })}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.requiredSkills")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.requiredSkills.length === 0 ? (
                        <span className="text-sm text-foreground/60">{t("notSpecified")}</span>
                      ) : (
                        job.requiredSkills.map((item) => (
                          <span key={item} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.requiredLanguages")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.requiredLanguages.length === 0 ? (
                        <span className="text-sm text-foreground/60">{t("notSpecified")}</span>
                      ) : (
                        job.requiredLanguages.map((item) => (
                          <span key={item} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-foreground/65">
                    {job.applicationDeadline
                      ? t("deadline", { date: new Date(job.applicationDeadline).toLocaleDateString(locale) })
                      : t("noDeadline")}
                  </div>
                  <Button
                    onClick={() => void apply(job.id)}
                    disabled={Boolean(job.applicationStatus) || busyId === job.id}
                    variant={job.applicationStatus ? "outline" : "default"}
                  >
                    {job.applicationStatus ? t(`applicationStatus.${job.applicationStatus}`) : busyId === job.id ? t("applying") : t("apply")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { useLiveRefresh } from "@/lib/live-refresh";
import ManagerJobApplicationActions from "@/components/manager-job-application-actions";

type QueueItem = {
  id: string;
  status: string;
  coverNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    profile: {
      city: string | null;
      state: string | null;
      pincode: string | null;
      address: string | null;
      workMode: string | null;
      workTime: string | null;
      workingPreference: string | null;
      internshipPreference: string | null;
      educationQualification: string | null;
      languages: string[];
    };
    skills: string[];
    experience: {
      totalWorkDays: number;
      digitalWorkDays: number;
      physicalWorkDays: number;
      approvedTaskCount: number;
      joinedJobsCount: number;
      activeSince: string | null;
      experienceLabel: string;
    } | null;
  };
  job: {
    id: string;
    title: string;
    description: string;
    jobCategory: string;
    jobType: string;
    city: string;
    state: string;
    workMode: string;
    employmentType: string;
    payAmount: number;
    payUnit: string;
    business: {
      id: string;
      name: string | null;
      email: string;
    };
  };
};

type Payload = {
  applications?: QueueItem[];
  error?: string;
};

export default function ManagerJobApplicationsPanel() {
  const t = useTranslations("manager.jobApplications");
  const [rows, setRows] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<"10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/job-applications", { credentials: "include" });
    const raw = await res.text();
    let parsed: Payload = {};
    try {
      parsed = raw ? (JSON.parse(raw) as Payload) : {};
    } catch {
      setError(t("unexpected"));
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed.error || t("failed"));
    } else {
      setError("");
      setRows(parsed.applications || []);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = !needle
      ? rows
      : rows.filter((row) =>
          [
            row.job.title,
            row.job.description,
            row.job.jobCategory,
            row.job.jobType,
            row.job.city,
            row.job.state,
            row.user.name,
            row.user.email,
            row.user.mobile,
            row.coverNote,
            row.user.skills.join(" "),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle))
        );
    return limit === "ALL" ? source : source.slice(0, Number(limit));
  }, [limit, query, rows]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      suspicious: rows.filter((row) => row.user.isSuspicious).length,
      internships: rows.filter((row) => row.job.employmentType === "INTERNSHIP").length,
    }),
    [rows]
  );

  if (loading) return <p className="text-sm text-white/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label={t("kpis.waiting")} value={stats.total} tone="warning" />
        <KpiCard label={t("kpis.flagged")} value={stats.suspicious} tone="warning" />
        <KpiCard label={t("kpis.internships")} value={stats.internships} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/60">{t("eyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("title")}</h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-white/60">
              <span>{t("show")}</span>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value as "10" | "20" | "ALL")}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="ALL">{t("showAll")}</option>
              </select>
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35 lg:w-80"
            />
          </div>
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => {
            const payout = getPhysicalWorkPayoutBreakdown(row.job.payAmount);
            return (
              <Card key={row.id} className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{row.job.title}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {row.job.business.name || t("fallbackBusiness")} | {row.job.city}, {row.job.state}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={row.user.level} tone="neutral" />
                      {row.user.isSuspicious ? <StatusBadge label={t("flagged")} tone="warning" /> : null}
                      {row.job.employmentType === "INTERNSHIP" ? <StatusBadge label={t("internship")} tone="info" /> : null}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t("candidate")}</p>
                      <p className="text-base font-semibold text-white">{row.user.name || row.user.email}</p>
                      <p className="text-sm text-white/65">
                        {row.user.profile.city || "-"}, {row.user.profile.state || "-"}
                      </p>
                      <p className="text-sm text-white/65">
                        {t("experienceLine", {
                          label: row.user.experience?.experienceLabel || t("noExperience"),
                          days: row.user.experience?.totalWorkDays || 0,
                        })}
                      </p>
                      <p className="text-xs text-white/50">
                        {t("experienceBreakdown", {
                          digital: row.user.experience?.digitalWorkDays || 0,
                          physical: row.user.experience?.physicalWorkDays || 0,
                          tasks: row.user.experience?.approvedTaskCount || 0,
                        })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {row.user.skills.length === 0 ? (
                          <span className="text-sm text-white/50">{t("noSkills")}</span>
                        ) : (
                          row.user.skills.map((skill) => (
                            <span key={skill} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80">
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                      {row.coverNote ? <p className="text-sm text-white/75">{row.coverNote}</p> : null}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/80">{row.job.description}</p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t("grossPay")}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{formatMoney(row.job.payAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t("workerShare")}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{formatMoney(payout.workerAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t("platformCut")}</p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {Math.round(payout.commissionRate * 100)}%
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="text-sm text-white/65">
                          <p>{t("workMode", { value: row.job.workMode.replaceAll("_", " ") })}</p>
                          <p className="mt-2">{t("employmentType", { value: row.job.employmentType.replaceAll("_", " ") })}</p>
                        </div>
                        <div className="text-sm text-white/65">
                          <p>{t("languages", { value: row.user.profile.languages.join(", ") || t("notProvided") })}</p>
                          <p className="mt-2">{t("education", { value: row.user.profile.educationQualification || t("notProvided") })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ManagerJobApplicationActions applicationId={row.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

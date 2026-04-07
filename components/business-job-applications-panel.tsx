"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toDateLocale } from "@/lib/date-locale";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "REJECTED"
  | "HIRED"
  | "JOINED"
  | "WITHDRAWN";

type ReviewStatus = "PENDING" | "MANAGER_APPROVED" | "MANAGER_REJECTED" | "ADMIN_APPROVED" | "ADMIN_REJECTED";
type AccessRole = "OWNER" | "EDITOR" | "VIEWER";
type FilterValue =
  | "ALL"
  | "PENDING_REVIEW"
  | "READY"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "HIRED"
  | "JOINED"
  | "REJECTED"
  | "WITHDRAWN";

type JobApplicantsResponse = {
  accessRole: AccessRole;
  canManage: boolean;
  applications: Array<{
    id: string;
    status: ApplicationStatus;
    managerStatus: ReviewStatus;
    adminStatus: ReviewStatus;
    managerReason: string | null;
    adminReason: string | null;
    coverNote: string | null;
    businessNote: string | null;
    interviewAt: string | null;
    joinedAt: string | null;
    createdAt: string;
    updatedAt: string;
    job: {
      id: string;
      title: string;
      jobCategory: string;
      jobType: string;
      customJobType: string | null;
      city: string;
      state: string;
      workMode: string;
      employmentType: string;
      payAmount: number;
      commissionRate: number;
      payUnit: string;
      status: string;
    };
    user: {
      id: string;
      name: string | null;
      skills: string[];
      profile: {
        city: string | null;
        state: string | null;
        pincode: string | null;
        latitude: number | null;
        longitude: number | null;
        workMode: string | null;
        workTime: string | null;
        workingPreference: string | null;
        internshipPreference: string | null;
        educationQualification: string | null;
        languages: string[];
      };
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
  }>;
  error?: string;
};

function moderationTone(row: JobApplicantsResponse["applications"][number]) {
  if (row.managerStatus === "MANAGER_REJECTED" || row.adminStatus === "ADMIN_REJECTED") return "danger" as const;
  if (row.adminStatus === "ADMIN_APPROVED") return "success" as const;
  return "warning" as const;
}

function statusTone(status: ApplicationStatus) {
  if (status === "SHORTLISTED" || status === "HIRED" || status === "JOINED") return "success" as const;
  if (status === "INTERVIEW_SCHEDULED") return "info" as const;
  if (status === "APPLIED") return "warning" as const;
  if (status === "WITHDRAWN") return "neutral" as const;
  return "danger" as const;
}

function matchesFilter(row: JobApplicantsResponse["applications"][number], filter: FilterValue) {
  if (filter === "ALL") return true;
  if (filter === "PENDING_REVIEW") {
    return row.managerStatus === "PENDING" || (row.managerStatus === "MANAGER_APPROVED" && row.adminStatus === "PENDING");
  }
  if (filter === "READY") return row.adminStatus === "ADMIN_APPROVED" && row.status === "APPLIED";
  if (filter === "REJECTED") {
    return row.status === "REJECTED" || row.managerStatus === "MANAGER_REJECTED" || row.adminStatus === "ADMIN_REJECTED";
  }
  return row.status === filter;
}

function sortPriority(row: JobApplicantsResponse["applications"][number]) {
  if (row.adminStatus === "ADMIN_APPROVED") {
    if (row.status === "APPLIED") return 0;
    if (row.status === "SHORTLISTED") return 1;
    if (row.status === "INTERVIEW_SCHEDULED") return 2;
    if (row.status === "HIRED") return 3;
    if (row.status === "JOINED") return 4;
  }
  if (row.managerStatus === "PENDING" || (row.managerStatus === "MANAGER_APPROVED" && row.adminStatus === "PENDING")) {
    return 5;
  }
  if (row.managerStatus === "MANAGER_REJECTED" || row.adminStatus === "ADMIN_REJECTED" || row.status === "REJECTED") {
    return 6;
  }
  if (row.status === "WITHDRAWN") return 7;
  return 8;
}

export default function BusinessJobApplicationsPanel() {
  const t = useTranslations("business.jobApplicantsPanel");
  const tDetail = useTranslations("business.jobDetail");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [data, setData] = useState<JobApplicantsResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");
  const [busyKey, setBusyKey] = useState("");
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});
  const [interviewTimes, setInterviewTimes] = useState<Record<string, string>>({});

  const filters: Array<{ value: FilterValue; label: string }> = [
    { value: "ALL", label: t("filters.ALL") },
    { value: "PENDING_REVIEW", label: t("filters.PENDING_REVIEW") },
    { value: "READY", label: t("filters.READY") },
    { value: "SHORTLISTED", label: t("filters.SHORTLISTED") },
    { value: "INTERVIEW_SCHEDULED", label: t("filters.INTERVIEW_SCHEDULED") },
    { value: "HIRED", label: t("filters.HIRED") },
    { value: "JOINED", label: t("filters.JOINED") },
    { value: "REJECTED", label: t("filters.REJECTED") },
    { value: "WITHDRAWN", label: t("filters.WITHDRAWN") },
  ];

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/job-applications", { credentials: "include" });
    const raw = await res.text();
    let parsed: JobApplicantsResponse = { accessRole: "VIEWER", canManage: false, applications: [] };
    try {
      parsed = raw ? (JSON.parse(raw) as JobApplicantsResponse) : parsed;
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
    setApplicationNotes((current) => {
      const next = { ...current };
      for (const item of parsed.applications) {
        if (typeof next[item.id] === "undefined") {
          next[item.id] = item.businessNote || "";
        }
      }
      return next;
    });
    setInterviewTimes((current) => {
      const next = { ...current };
      for (const item of parsed.applications) {
        if (typeof next[item.id] === "undefined") {
          next[item.id] = item.interviewAt ? item.interviewAt.slice(0, 16) : "";
        }
      }
      return next;
    });
  }, [t]);

  useLiveRefresh(load, 10000);

  const summary = useMemo(() => {
    const rows = data?.applications || [];
    return {
      total: rows.length,
      pendingModeration: rows.filter((row) => matchesFilter(row, "PENDING_REVIEW")).length,
      ready: rows.filter((row) => matchesFilter(row, "READY")).length,
      interviews: rows.filter((row) => row.status === "INTERVIEW_SCHEDULED").length,
      hired: rows.filter((row) => row.status === "HIRED").length,
      joined: rows.filter((row) => row.status === "JOINED").length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data?.applications || [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!matchesFilter(row, filter)) return false;
        if (!q) return true;
        return [
          row.job.title,
          row.job.jobCategory,
          row.job.customJobType || row.job.jobType,
          row.job.city,
          row.job.state,
          row.user.name || "",
          row.coverNote || "",
          row.businessNote || "",
          row.user.profile.city || "",
          row.user.profile.state || "",
          row.user.profile.educationQualification || "",
          ...row.user.skills,
          ...row.user.profile.languages,
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const priorityDiff = sortPriority(a) - sortPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [data, filter, query]);

  const visibleRows = useMemo(
    () => (limit === "ALL" ? filtered : filtered.slice(0, Number(limit))),
    [filtered, limit]
  );

  function moderationLabel(row: JobApplicantsResponse["applications"][number]) {
    if (row.managerStatus === "MANAGER_REJECTED") return tDetail("application.moderationRejectedManager");
    if (row.adminStatus === "ADMIN_REJECTED") return tDetail("application.moderationRejectedAdmin");
    if (row.adminStatus === "ADMIN_APPROVED") return tDetail("application.moderationApproved");
    if (row.managerStatus === "MANAGER_APPROVED") return tDetail("application.moderationPendingAdmin");
    return tDetail("application.moderationPendingManager");
  }

  async function updateApplication(
    jobId: string,
    applicationId: string,
    payload: {
      status?: "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "REJECTED" | "HIRED" | "JOINED";
      businessNote?: string;
      interviewAt?: string;
    }
  ) {
    const actionKey = payload.status || "NOTE";
    setBusyKey(`application:${applicationId}:${actionKey}`);
    setMessage("");
    const res = await fetch(`/api/v2/business/jobs/${jobId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpectedServerResponse") };
    }
    setBusyKey("");
    if (!res.ok) {
      setMessage(parsed.error || t("errors.actionFailed"));
      return;
    }
    setMessage(parsed.message || t("messages.updated"));
    emitDashboardLiveRefresh();
    void load();
  }

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label={t("kpis.total")} value={summary.total} />
        <KpiCard label={t("kpis.pendingModeration")} value={summary.pendingModeration} tone="warning" />
        <KpiCard label={t("kpis.readyForBusiness")} value={summary.ready} tone="success" />
        <KpiCard label={t("kpis.interviews")} value={summary.interviews} tone="info" />
        <KpiCard label={t("kpis.hired")} value={summary.hired} tone="info" />
        <KpiCard label={t("kpis.joined")} value={summary.joined} tone="success" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-foreground/60">{t("header.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("header.title")}</h3>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/60">
            <span>{t("controls.show")}</span>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
              className="rounded-xl border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="ALL">{t("controls.showAll")}</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="border-foreground/15 bg-background/60 pl-10 text-foreground placeholder:text-foreground/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  filter === item.value
                    ? "border-sky-400/30 bg-sky-400/10 text-sky-800 dark:text-sky-100"
                    : "border-foreground/10 bg-background/60 text-foreground/70 hover:bg-background/80 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </SectionCard>

      {filtered.length === 0 ? (
        <SectionCard className="border-dashed border-foreground/15 p-6 text-sm text-foreground/60">
          {t("empty")}
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {visibleRows.map((application) => {
            const canManage = data.canManage && application.adminStatus === "ADMIN_APPROVED";
            const workerTakeHome = application.job.payAmount * (1 - application.job.commissionRate);

            return (
              <SectionCard key={application.id} elevated className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">
                        {application.user.name || t("fallback.unnamedApplicant")}
                      </h4>
                      <StatusBadge
                        label={tDetail(`applicationStatus.${application.status}`)}
                        tone={statusTone(application.status)}
                      />
                      <StatusBadge label={moderationLabel(application)} tone={moderationTone(application)} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-foreground/65">
                      <span className="font-medium text-foreground/85">{application.job.title}</span>
                      <span>{application.job.city}, {application.job.state}</span>
                      <span>{application.job.customJobType || application.job.jobType}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-foreground/55">
                      <span>{tDetail("job.workerTakeHome", { amount: formatMoney(workerTakeHome) })}</span>
                      <span>{tDetail("job.physicalCommission", { percent: Math.round(application.job.commissionRate * 100) })}</span>
                      <span>
                        {t("card.appliedAt", {
                          value: new Date(application.createdAt).toLocaleString(dateLocale, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        })}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/business/jobs/${application.job.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground/80 transition hover:bg-background/80 hover:text-foreground"
                  >
                    {t("card.openJob")}
                  </Link>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.coverNote")}</p>
                    <p className="mt-2 text-sm text-foreground/75">
                      {application.coverNote || tDetail("application.notProvided")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.experience")}</p>
                    {application.user.experience ? (
                      <>
                        <p className="mt-2 text-sm text-foreground/80">
                          {t("card.experienceLine", {
                            label: application.user.experience.experienceLabel,
                            days: application.user.experience.totalWorkDays,
                          })}
                        </p>
                        <p className="mt-1 text-xs text-foreground/55">
                          {t("card.experienceBreakdown", {
                            digital: application.user.experience.digitalWorkDays,
                            physical: application.user.experience.physicalWorkDays,
                            tasks: application.user.experience.approvedTaskCount,
                          })}
                        </p>
                      </>
                    ) : <p className="mt-2 text-sm text-foreground/60">{t("card.noExperience")}</p>}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{tDetail("application.skills")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.user.skills.length === 0 ? (
                        <span className="text-sm text-foreground/60">{tDetail("application.notProvided")}</span>
                      ) : (
                        application.user.skills.map((item, index) => (
                          <span
                            key={`${application.id}:skill:${index}:${item}`}
                            className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80"
                          >
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{tDetail("application.languages")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.user.profile.languages.length === 0 ? (
                        <span className="text-sm text-foreground/60">{tDetail("application.notProvided")}</span>
                      ) : (
                        application.user.profile.languages.map((item, index) => (
                          <span
                            key={`${application.id}:language:${index}:${item}`}
                            className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80"
                          >
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-foreground/70 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="text-foreground/50">{tDetail("application.workMode")}:</span>{" "}
                    {application.user.profile.workMode
                      ? tDetail(`profileWorkModes.${application.user.profile.workMode}`)
                      : tDetail("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{tDetail("application.workTime")}:</span>{" "}
                    {application.user.profile.workTime
                      ? tDetail(`profileWorkTimes.${application.user.profile.workTime}`)
                      : tDetail("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{tDetail("application.preference")}:</span>{" "}
                    {application.user.profile.workingPreference
                      ? tDetail(`profilePreferences.${application.user.profile.workingPreference}`)
                      : tDetail("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{tDetail("application.education")}:</span>{" "}
                    {application.user.profile.educationQualification || tDetail("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{tDetail("application.internship")}:</span>{" "}
                    {application.user.profile.internshipPreference || tDetail("application.notProvided")}
                  </div>
                </div>

                {application.adminStatus !== "ADMIN_APPROVED" ? (
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
                    {moderationLabel(application)}
                    {application.managerReason ? <p className="mt-2 text-xs text-foreground/55">{application.managerReason}</p> : null}
                    {application.adminReason ? <p className="mt-2 text-xs text-foreground/55">{application.adminReason}</p> : null}
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{tDetail("application.businessNote")}</p>
                    <textarea
                      value={applicationNotes[application.id] || ""}
                      onChange={(e) =>
                        setApplicationNotes((current) => ({
                          ...current,
                          [application.id]: e.target.value.slice(0, 500),
                        }))
                      }
                      disabled={!canManage}
                      placeholder={tDetail("application.businessNotePlaceholder")}
                      className="mt-3 min-h-[92px] w-full rounded-xl border border-foreground/15 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/30"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busyKey === `application:${application.id}:NOTE` || !canManage}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {busyKey === `application:${application.id}:NOTE`
                          ? tDetail("actions.savingNote")
                          : tDetail("actions.saveNote")}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{tDetail("application.interview")}</p>
                    <input
                      type="datetime-local"
                      value={interviewTimes[application.id] || ""}
                      onChange={(e) =>
                        setInterviewTimes((current) => ({
                          ...current,
                          [application.id]: e.target.value,
                        }))
                      }
                      disabled={!canManage}
                      className="mt-3 min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
                    />
                    {application.interviewAt ? (
                      <p className="mt-3 text-sm text-foreground/70">
                        {tDetail("application.interviewScheduledAt", {
                          value: new Date(application.interviewAt).toLocaleString(dateLocale),
                        })}
                      </p>
                    ) : null}
                    {application.joinedAt ? (
                      <p className="mt-2 text-sm text-foreground/70">
                        {tDetail("application.joinedAt", {
                          value: new Date(application.joinedAt).toLocaleString(dateLocale),
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {application.status === "APPLIED" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyKey === `application:${application.id}:SHORTLISTED`}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            status: "SHORTLISTED",
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {tDetail("actions.shortlist")}
                      </Button>
                    ) : null}
                    {!['HIRED', 'JOINED', 'REJECTED', 'WITHDRAWN'].includes(application.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyKey === `application:${application.id}:INTERVIEW_SCHEDULED`}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            status: "INTERVIEW_SCHEDULED",
                            interviewAt: interviewTimes[application.id] || "",
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {tDetail("actions.scheduleInterview")}
                      </Button>
                    ) : null}
                    {!['HIRED', 'JOINED', 'REJECTED', 'WITHDRAWN'].includes(application.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyKey === `application:${application.id}:HIRED`}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            status: "HIRED",
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {tDetail("actions.hire")}
                      </Button>
                    ) : null}
                    {application.status === "HIRED" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyKey === `application:${application.id}:JOINED`}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            status: "JOINED",
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {tDetail("actions.markJoined")}
                      </Button>
                    ) : null}
                    {!['REJECTED', 'JOINED', 'WITHDRAWN'].includes(application.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyKey === `application:${application.id}:REJECTED`}
                        onClick={() =>
                          void updateApplication(application.job.id, application.id, {
                            status: "REJECTED",
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {tDetail("actions.reject")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

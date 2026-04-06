"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import BusinessJobEditor from "@/components/business-job-editor";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
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
type JobStatus = "PENDING_REVIEW" | "OPEN" | "REJECTED" | "PAUSED" | "CLOSED" | "FILLED";

type JobPayload = {
  accessRole: "OWNER" | "EDITOR" | "VIEWER";
  job: {
    id: string;
    title: string;
    description: string;
    jobCategory: string;
    jobType: string;
    customJobType: string | null;
    workMode: string;
    employmentType: string;
    city: string;
    state: string;
    pincode: string | null;
    addressLine: string | null;
    latitude: number | null;
    longitude: number | null;
    hiringRadiusKm: number | null;
    openings: number;
    payAmount: number;
    commissionRate: number;
    budgetRequired: number;
    payUnit: string;
    shiftSummary: string | null;
    startDate: string | null;
    applicationDeadline: string | null;
    requiredSkills: string[];
    requiredLanguages: string[];
    minEducation: string | null;
    status: JobStatus;
    reviewNote: string | null;
    applications: Array<{
      id: string;
      status: ApplicationStatus;
      managerStatus: string;
      adminStatus: string;
      managerReason: string | null;
      adminReason: string | null;
      coverNote: string | null;
      businessNote: string | null;
      interviewAt: string | null;
      joinedAt: string | null;
      createdAt: string;
      user: {
        id: string;
        name: string | null;
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
    }>;
  };
  error?: string;
};

function statusTone(status: JobStatus | ApplicationStatus) {
  if (status === "OPEN" || status === "SHORTLISTED" || status === "HIRED" || status === "JOINED") return "success";
  if (status === "INTERVIEW_SCHEDULED") return "info";
  if (status === "PAUSED" || status === "APPLIED" || status === "PENDING_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

function moderationLabel(application: JobPayload["job"]["applications"][number], t: ReturnType<typeof useTranslations>) {
  if (application.managerStatus === "MANAGER_REJECTED") return t("application.moderationRejectedManager");
  if (application.adminStatus === "ADMIN_REJECTED") return t("application.moderationRejectedAdmin");
  if (application.adminStatus === "ADMIN_APPROVED") return t("application.moderationApproved");
  if (application.managerStatus === "MANAGER_APPROVED") return t("application.moderationPendingAdmin");
  return t("application.moderationPendingManager");
}

export default function BusinessJobDetailPanel({ jobId }: { jobId: string }) {
  const t = useTranslations("business.jobDetail");
  const [data, setData] = useState<JobPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});
  const [interviewTimes, setInterviewTimes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/v2/business/jobs/${jobId}`, { credentials: "include" });
    const raw = await res.text();
    let parsed: JobPayload = { accessRole: "VIEWER", job: null as never };
    try {
      parsed = raw ? (JSON.parse(raw) as JobPayload) : parsed;
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
      setApplicationNotes((current) => {
        const next = { ...current };
        for (const item of parsed.job.applications) {
          if (typeof next[item.id] === "undefined") {
            next[item.id] = item.businessNote || "";
          }
        }
        return next;
      });
      setInterviewTimes((current) => {
        const next = { ...current };
        for (const item of parsed.job.applications) {
          if (typeof next[item.id] === "undefined") {
            next[item.id] = item.interviewAt ? item.interviewAt.slice(0, 16) : "";
          }
        }
        return next;
      });
    }
    setLoading(false);
  }, [jobId, t]);

  useLiveRefresh(load, 10000);

  const stats = useMemo(() => {
    const applications = data?.job.applications || [];
    return {
      total: applications.length,
      applied: applications.filter((item) => item.managerStatus === "PENDING").length,
      shortlisted: applications.filter((item) => item.adminStatus === "ADMIN_APPROVED").length,
      interviewed: applications.filter((item) => item.status === "INTERVIEW_SCHEDULED").length,
      hired: applications.filter((item) => ["HIRED", "JOINED"].includes(item.status)).length,
      joined: applications.filter((item) => item.status === "JOINED").length,
    };
  }, [data]);

  async function updateJob(action: "PAUSE" | "REOPEN" | "CLOSE" | "FILL") {
    setBusyKey(`job:${action}`);
    setMessage("");
    const res = await fetch(`/api/v2/business/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
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

  async function updateApplication(
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

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return null;

  const { job, accessRole } = data;
  const canManage = accessRole === "OWNER" || accessRole === "EDITOR";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.totalApplications")} value={stats.total} />
        <KpiCard label={t("kpis.newApplications")} value={stats.applied} tone="warning" />
        <KpiCard label={t("kpis.interviewed")} value={stats.interviewed} tone="info" />
        <KpiCard label={t("kpis.hired")} value={stats.hired} tone="info" />
      </div>

      <SectionCard elevated className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold text-foreground">{job.title}</h3>
              <StatusBadge label={t(`status.${job.status}`)} tone={statusTone(job.status)} />
            </div>
            <p className="text-sm text-foreground/70">{job.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
              <span>{job.jobCategory}</span>
              <span>{job.customJobType || job.jobType}</span>
              <span>{job.city}, {job.state}</span>
              {job.hiringRadiusKm ? <span>{t("job.radius", { value: job.hiringRadiusKm })}</span> : null}
              <span>{t("job.payLine", { amount: formatMoney(job.payAmount), unit: t(`payUnits.${job.payUnit}`) })}</span>
              <span>{t("job.workerTakeHome", { amount: formatMoney(job.payAmount * (1 - job.commissionRate)) })}</span>
            </div>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen((prev) => !prev)}>
                {editOpen ? t("actions.closeEdit") : t("actions.edit")}
              </Button>
              {job.status === "OPEN" ? (
                <Button variant="outline" disabled={busyKey === "job:PAUSE"} onClick={() => void updateJob("PAUSE")}>
                  {t("actions.pause")}
                </Button>
              ) : null}
              {job.status === "PAUSED" ? (
                <Button variant="outline" disabled={busyKey === "job:REOPEN"} onClick={() => void updateJob("REOPEN")}>
                  {t("actions.reopen")}
                </Button>
              ) : null}
              {!["FILLED", "CLOSED"].includes(job.status) ? (
                <Button variant="outline" disabled={busyKey === "job:CLOSE"} onClick={() => void updateJob("CLOSE")}>
                  {t("actions.close")}
                </Button>
              ) : null}
              {job.status !== "FILLED" ? (
                <Button variant="outline" disabled={busyKey === "job:FILL"} onClick={() => void updateJob("FILL")}>
                  {t("actions.markFilled")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
        {["PENDING_REVIEW", "REJECTED"].includes(job.status) ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
            {job.status === "PENDING_REVIEW" ? t("job.awaitingAdminReview") : t("job.rejectedByAdmin")}
            {job.reviewNote ? <p className="mt-2 text-xs text-amber-50/80">{job.reviewNote}</p> : null}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.openings")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{job.openings}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.workMode")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{t(`workModes.${job.workMode}`)}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.employmentType")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{t(`employmentTypes.${job.employmentType}`)}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.location")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{job.city}, {job.state}</p>
            {job.pincode ? <p className="mt-1 text-xs text-foreground/60">{job.pincode}</p> : null}
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.fundRequired")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{formatMoney(job.budgetRequired)}</p>
            <p className="mt-1 text-xs text-foreground/60">{t("job.physicalCommission", { percent: Math.round(job.commissionRate * 100) })}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.requiredSkills")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.requiredSkills.length === 0 ? (
                <span className="text-sm text-foreground/60">{t("job.notSpecified")}</span>
              ) : (
                job.requiredSkills.map((item) => (
                  <span key={item} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("job.requiredLanguages")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.requiredLanguages.length === 0 ? (
                <span className="text-sm text-foreground/60">{t("job.notSpecified")}</span>
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
      </SectionCard>

      {editOpen ? (
        <BusinessJobEditor
          jobId={jobId}
          initialJob={{
            title: job.title,
            description: job.description,
            jobCategory: job.jobCategory,
            jobType: job.jobType,
            customJobType: job.customJobType,
            workMode: job.workMode,
            employmentType: job.employmentType,
            city: job.city,
            state: job.state,
            pincode: job.pincode,
            addressLine: job.addressLine,
            latitude: job.latitude,
            longitude: job.longitude,
            hiringRadiusKm: job.hiringRadiusKm,
            openings: job.openings,
            payAmount: job.payAmount,
            payUnit: job.payUnit,
            shiftSummary: job.shiftSummary,
            startDate: job.startDate,
            applicationDeadline: job.applicationDeadline,
            requiredSkills: job.requiredSkills,
            requiredLanguages: job.requiredLanguages,
            minEducation: job.minEducation,
          }}
          onSaved={() => {
            setEditOpen(false);
            void load();
          }}
        />
      ) : null}

      <SectionCard elevated className="space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("applicationsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("applicationsTitle")}</h3>
        </div>

        {job.applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-8 text-center text-sm text-foreground/60">
            {t("noApplications")}
          </div>
        ) : (
          <div className="space-y-4">
            {job.applications.map((application) => (
              <div key={application.id} className="rounded-3xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">{application.user.name || t("application.unnamed")}</h4>
                      <StatusBadge label={t(`applicationStatus.${application.status}`)} tone={statusTone(application.status)} />
                      <StatusBadge label={moderationLabel(application, t)} tone={application.adminStatus === "ADMIN_APPROVED" ? "success" : application.managerStatus === "MANAGER_REJECTED" || application.adminStatus === "ADMIN_REJECTED" ? "danger" : "warning"} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                      {application.user.profile.city ? (
                        <span>{application.user.profile.city}, {application.user.profile.state || "-"}</span>
                      ) : null}
                      {application.user.experience ? (
                        <span>{t("application.experienceLine", { label: application.user.experience.experienceLabel, days: application.user.experience.totalWorkDays })}</span>
                      ) : null}
                    </div>
                    {application.coverNote ? (
                      <p className="text-sm text-foreground/70">{application.coverNote}</p>
                    ) : null}
                  </div>

                  {canManage && application.adminStatus === "ADMIN_APPROVED" ? (
                    <div className="flex flex-wrap gap-2">
                      {application.status === "APPLIED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyKey === `application:${application.id}:SHORTLISTED`}
                          onClick={() =>
                            void updateApplication(application.id, {
                              status: "SHORTLISTED",
                              businessNote: applicationNotes[application.id] || "",
                            })
                          }
                        >
                          {t("actions.shortlist")}
                        </Button>
                      ) : null}
                      {!["HIRED", "JOINED", "REJECTED"].includes(application.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyKey === `application:${application.id}:INTERVIEW_SCHEDULED`}
                          onClick={() =>
                            void updateApplication(application.id, {
                              status: "INTERVIEW_SCHEDULED",
                              interviewAt: interviewTimes[application.id] || "",
                              businessNote: applicationNotes[application.id] || "",
                            })
                          }
                        >
                          {t("actions.scheduleInterview")}
                        </Button>
                      ) : null}
                      {!["HIRED", "JOINED", "REJECTED"].includes(application.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyKey === `application:${application.id}:HIRED`}
                          onClick={() =>
                            void updateApplication(application.id, {
                              status: "HIRED",
                              businessNote: applicationNotes[application.id] || "",
                            })
                          }
                        >
                          {t("actions.hire")}
                        </Button>
                      ) : null}
                      {application.status === "HIRED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyKey === `application:${application.id}:JOINED`}
                          onClick={() =>
                            void updateApplication(application.id, {
                              status: "JOINED",
                              businessNote: applicationNotes[application.id] || "",
                            })
                          }
                        >
                          {t("actions.markJoined")}
                        </Button>
                      ) : null}
                      {!["REJECTED", "JOINED"].includes(application.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyKey === `application:${application.id}:REJECTED`}
                          onClick={() =>
                            void updateApplication(application.id, {
                              status: "REJECTED",
                              businessNote: applicationNotes[application.id] || "",
                            })
                          }
                        >
                          {t("actions.reject")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {application.adminStatus !== "ADMIN_APPROVED" ? (
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
                    {moderationLabel(application, t)}
                    {application.managerReason ? <p className="mt-2 text-xs text-foreground/55">{application.managerReason}</p> : null}
                    {application.adminReason ? <p className="mt-2 text-xs text-foreground/55">{application.adminReason}</p> : null}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("application.skills")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.user.skills.length === 0 ? (
                        <span className="text-sm text-foreground/60">{t("application.notProvided")}</span>
                      ) : (
                        application.user.skills.map((item) => (
                          <span key={item} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("application.languages")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.user.profile.languages.length === 0 ? (
                        <span className="text-sm text-foreground/60">{t("application.notProvided")}</span>
                      ) : (
                        application.user.profile.languages.map((item) => (
                          <span key={item} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm text-foreground/70">
                  <div>
                    <span className="text-foreground/50">{t("application.workMode")}:</span>{" "}
                    {application.user.profile.workMode ? t(`profileWorkModes.${application.user.profile.workMode}`) : t("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{t("application.workTime")}:</span>{" "}
                    {application.user.profile.workTime ? t(`profileWorkTimes.${application.user.profile.workTime}`) : t("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{t("application.preference")}:</span>{" "}
                    {application.user.profile.workingPreference
                      ? t(`profilePreferences.${application.user.profile.workingPreference}`)
                      : t("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{t("application.education")}:</span>{" "}
                    {application.user.profile.educationQualification || t("application.notProvided")}
                  </div>
                  <div>
                    <span className="text-foreground/50">{t("application.internship")}:</span>{" "}
                    {application.user.profile.internshipPreference || t("application.notProvided")}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("application.businessNote")}</p>
                    <textarea
                      value={applicationNotes[application.id] || ""}
                      onChange={(e) =>
                        setApplicationNotes((current) => ({
                          ...current,
                          [application.id]: e.target.value.slice(0, 500),
                        }))
                      }
                      disabled={application.adminStatus !== "ADMIN_APPROVED"}
                      placeholder={t("application.businessNotePlaceholder")}
                      className="mt-3 min-h-[92px] w-full rounded-xl border border-foreground/15 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/30"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busyKey === `application:${application.id}:NOTE` || application.adminStatus !== "ADMIN_APPROVED"}
                        onClick={() =>
                          void updateApplication(application.id, {
                            businessNote: applicationNotes[application.id] || "",
                          })
                        }
                      >
                        {busyKey === `application:${application.id}:NOTE` ? t("actions.savingNote") : t("actions.saveNote")}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("application.interview")}</p>
                    <input
                      type="datetime-local"
                      value={interviewTimes[application.id] || ""}
                      onChange={(e) =>
                        setInterviewTimes((current) => ({
                          ...current,
                          [application.id]: e.target.value,
                        }))
                      }
                      disabled={application.adminStatus !== "ADMIN_APPROVED"}
                      className="mt-3 min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
                    />
                    {application.interviewAt ? (
                      <p className="mt-3 text-sm text-foreground/70">
                        {t("application.interviewScheduledAt", { value: new Date(application.interviewAt).toLocaleString() })}
                      </p>
                    ) : null}
                    {application.joinedAt ? (
                      <p className="mt-2 text-sm text-foreground/70">
                        {t("application.joinedAt", { value: new Date(application.joinedAt).toLocaleString() })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

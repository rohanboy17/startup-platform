"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type Application = {
  id: string;
  status: "APPLIED" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "REJECTED" | "HIRED" | "JOINED" | "WITHDRAWN";
  coverNote: string | null;
  businessNote: string | null;
  interviewAt: string | null;
  joinedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    description: string;
    businessName: string;
    city: string;
    state: string;
    pincode: string | null;
    workMode: string;
    employmentType: string;
    payAmount: number;
    payUnit: string;
    status: "OPEN" | "PAUSED" | "CLOSED" | "FILLED";
  };
};

type Payload = {
  applications: Application[];
  summary: {
    total: number;
    applied: number;
    shortlisted: number;
    interviewed: number;
    hired: number;
    joined: number;
    rejected: number;
  };
  profile: {
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  error?: string;
};

function tone(status: Application["status"]) {
  if (status === "HIRED" || status === "SHORTLISTED" || status === "JOINED") return "success";
  if (status === "INTERVIEW_SCHEDULED") return "info";
  if (status === "APPLIED") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export default function UserJobApplicationsPanel() {
  const t = useTranslations("user.jobApplications");
  const locale = useLocale();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/job-applications", { credentials: "include" });
    const raw = await res.text();
    let parsed: Payload = {
      applications: [],
      summary: { total: 0, applied: 0, shortlisted: 0, interviewed: 0, hired: 0, joined: 0, rejected: 0 },
      profile: { city: null, state: null, pincode: null },
    };
    try {
      parsed = raw ? (JSON.parse(raw) as Payload) : parsed;
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
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  const openApplications = useMemo(
    () => (data?.applications || []).filter((item) => ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(item.status)),
    [data]
  );

  async function withdraw(applicationId: string) {
    setBusyId(applicationId);
    setMessage("");
    const res = await fetch(`/api/v2/users/me/job-applications/${applicationId}`, {
      method: "PATCH",
      credentials: "include",
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
      setMessage(parsed.error || t("errors.withdrawFailed"));
      return;
    }
    setMessage(parsed.message || t("messages.withdrawn"));
    void load();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label={t("kpis.total")} value={data.summary.total} />
        <KpiCard label={t("kpis.applied")} value={data.summary.applied} tone="warning" />
        <KpiCard label={t("kpis.shortlisted")} value={data.summary.shortlisted} tone="success" />
        <KpiCard label={t("kpis.interviewed")} value={data.summary.interviewed} tone="info" />
        <KpiCard label={t("kpis.hired")} value={data.summary.hired} tone="info" />
        <KpiCard label={t("kpis.rejected")} value={data.summary.rejected} tone="danger" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("title")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("subtitle")}</p>
        </div>
        <p className="text-sm text-foreground/65">
          {data.profile.city && data.profile.state
            ? t("locationHint", { city: data.profile.city, state: data.profile.state })
            : t("missingLocationHint")}
        </p>
        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </SectionCard>

      {data.applications.length === 0 ? (
        <SectionCard elevated className="p-8 text-center text-sm text-foreground/60">
          {t("empty")}
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {data.applications.map((application) => (
            <SectionCard key={application.id} elevated className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-foreground">{application.job.title}</h4>
                    <StatusBadge label={t(`status.${application.status}`)} tone={tone(application.status)} />
                  </div>
                  <p className="text-sm text-foreground/60">{application.job.businessName}</p>
                  <p className="text-sm text-foreground/70">{application.job.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                    <span>{application.job.city}, {application.job.state}</span>
                    <span>{t(`workModes.${application.job.workMode}`)}</span>
                    <span>{t(`employmentTypes.${application.job.employmentType}`)}</span>
                  </div>
                </div>
                {["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(application.status) ? (
                  <Button
                    variant="outline"
                    disabled={busyId === application.id}
                    onClick={() => void withdraw(application.id)}
                  >
                    {busyId === application.id ? t("withdrawing") : t("withdraw")}
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.pay")}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">INR {formatMoney(application.job.payAmount)}</p>
                  <p className="mt-1 text-xs text-foreground/60">{t(`payUnits.${application.job.payUnit}`)}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.jobStatus")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{t(`jobStatus.${application.job.status}`)}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.appliedAt")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{new Date(application.createdAt).toLocaleString(locale)}</p>
                </div>
              </div>

              {application.coverNote ? (
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("coverNote")}</p>
                  <p className="mt-2 text-sm text-foreground/75">{application.coverNote}</p>
                </div>
              ) : null}

              {application.businessNote ? (
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("businessNote")}</p>
                  <p className="mt-2 text-sm text-foreground/75">{application.businessNote}</p>
                </div>
              ) : null}

              {application.interviewAt ? (
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("interviewAt")}</p>
                  <p className="mt-2 text-sm text-foreground/75">{new Date(application.interviewAt).toLocaleString(locale)}</p>
                </div>
              ) : null}

              {application.joinedAt ? (
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("joinedAt")}</p>
                  <p className="mt-2 text-sm text-foreground/75">{new Date(application.joinedAt).toLocaleString(locale)}</p>
                </div>
              ) : null}
            </SectionCard>
          ))}
        </div>
      )}

      {openApplications.length > 0 ? (
        <SectionCard elevated className="p-4 text-sm text-foreground/65">
          {t("openApplicationsHint", { count: openApplications.length })}
        </SectionCard>
      ) : null}
    </div>
  );
}

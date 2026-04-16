"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
type InterviewMode = "VIRTUAL" | "IN_PERSON" | "PHONE";
type AttendanceStatus = "PENDING" | "ATTENDED" | "NO_SHOW";

type InterviewPayload = {
  summary: {
    scheduled: number;
    next24h: number;
    needsMeetingLink: number;
    pendingAttendance: number;
    reminderWindowMinutes: number;
  };
  interviews: Array<{
    id: string;
    applicationId: string;
    roundNumber: number;
    title: string | null;
    status: InterviewStatus;
    mode: InterviewMode;
    scheduledAt: string;
    durationMinutes: number;
    timezone: string;
    locationNote: string | null;
    meetingProvider: string | null;
    meetingUrl: string | null;
    adminNote: string | null;
    interviewerNotes: string | null;
    scorecard: {
      overall?: number | null;
      communication?: number | null;
      roleFit?: number | null;
      reliability?: number | null;
      summary?: string | null;
    } | null;
    rescheduledAt: string | null;
    rescheduleReason: string | null;
    cancelledAt: string | null;
    cancelledReason: string | null;
    completedAt: string | null;
    attendanceStatus: AttendanceStatus;
    attendedAt: string | null;
    attendanceMarkedAt: string | null;
    meetingSharedAt: string | null;
    reminderSentAt: string | null;
    application: {
      id: string;
      status: string;
      adminStatus: string;
      joinedAt: string | null;
      job: {
        id: string;
        title: string;
        business: {
          id: string;
          name: string | null;
        };
      };
      user: {
        id: string;
        name: string | null;
      };
    };
  }>;
  error?: string;
};

type Draft = {
  scheduledAt: string;
  durationMinutes: string;
  mode: InterviewMode;
  title: string;
  adminNote: string;
  rescheduleReason: string;
  cancelledReason: string;
  interviewerNotes: string;
  attendanceStatus: AttendanceStatus;
  overall: string;
  communication: string;
  roleFit: string;
  reliability: string;
  summary: string;
};

type CreateDraft = {
  applicationId: string;
  scheduledAt: string;
  durationMinutes: string;
  mode: InterviewMode;
  title: string;
  adminNote: string;
};

function toDateTimeLocalInput(value: string) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function buildDraft(interview: InterviewPayload["interviews"][number]): Draft {
  return {
    scheduledAt: toDateTimeLocalInput(interview.scheduledAt),
    durationMinutes: String(interview.durationMinutes || 30),
    mode: interview.mode,
    title: interview.title || "",
    adminNote: interview.adminNote || "",
    rescheduleReason: interview.rescheduleReason || "",
    cancelledReason: interview.cancelledReason || "",
    interviewerNotes: interview.interviewerNotes || "",
    attendanceStatus: interview.attendanceStatus,
    overall: interview.scorecard?.overall ? String(interview.scorecard.overall) : "",
    communication: interview.scorecard?.communication ? String(interview.scorecard.communication) : "",
    roleFit: interview.scorecard?.roleFit ? String(interview.scorecard.roleFit) : "",
    reliability: interview.scorecard?.reliability ? String(interview.scorecard.reliability) : "",
    summary: interview.scorecard?.summary || "",
  };
}

function createDefaultDraft(): CreateDraft {
  return {
    applicationId: "",
    scheduledAt: "",
    durationMinutes: "30",
    mode: "VIRTUAL",
    title: "",
    adminNote: "",
  };
}

function toneForStatus(status: InterviewStatus) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "info" as const;
}

function toneForAttendance(status: AttendanceStatus) {
  if (status === "ATTENDED") return "success" as const;
  if (status === "NO_SHOW") return "danger" as const;
  return "warning" as const;
}

export default function AdminInterviewsPanel() {
  const t = useTranslations("admin.interviewsPage");
  const locale = useLocale();
  const [status, setStatus] = useState<"ALL" | InterviewStatus>("ALL");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<InterviewPayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [createDraft, setCreateDraft] = useState<CreateDraft>(createDefaultDraft());

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/v2/admin/interviews?${params.toString()}`, { credentials: "include" });
    const raw = await res.text();
    let parsed: InterviewPayload = {
      summary: { scheduled: 0, next24h: 0, needsMeetingLink: 0, pendingAttendance: 0, reminderWindowMinutes: 60 },
      interviews: [],
    };
    try {
      parsed = raw ? (JSON.parse(raw) as InterviewPayload) : parsed;
    } catch {
      setError(t("errors.unexpected"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    setData(parsed);
    setDrafts((current) => {
      const next = { ...current };
      for (const interview of parsed.interviews) {
        if (!next[interview.id]) {
          next[interview.id] = buildDraft(interview);
        }
      }
      return next;
    });
  }, [query, status, t]);

  useLiveRefresh(load, 12000);

  const grouped = useMemo(() => {
    const groups = new Map<string, InterviewPayload["interviews"]>();
    for (const interview of data?.interviews || []) {
      const key = new Date(interview.scheduledAt).toLocaleDateString(locale, {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const existing = groups.get(key) || [];
      existing.push(interview);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [data, locale]);

  function updateDraft(interviewId: string, field: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [interviewId]: {
        ...(current[interviewId] || {
          scheduledAt: "",
          durationMinutes: "30",
          mode: "VIRTUAL",
          title: "",
          adminNote: "",
          rescheduleReason: "",
          cancelledReason: "",
          interviewerNotes: "",
          attendanceStatus: "PENDING",
          overall: "",
          communication: "",
          roleFit: "",
          reliability: "",
          summary: "",
        }),
        [field]: value,
      },
    }));
  }

  async function patchInterview(interviewId: string, body: Record<string, unknown>) {
    setBusyKey(interviewId);
    setMessage("");
    const res = await fetch(`/api/v2/admin/interviews/${interviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }
    setBusyKey("");
    if (!res.ok) {
      setMessage(parsed.error || t("errors.failedToUpdate"));
      return;
    }
    setMessage(parsed.message || t("messages.updated"));
    emitDashboardLiveRefresh();
    void load();
  }

  async function createRound() {
    setBusyKey("create-round");
    setMessage("");
    const res = await fetch("/api/v2/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        applicationId: createDraft.applicationId,
        scheduledAt: createDraft.scheduledAt,
        durationMinutes: Number(createDraft.durationMinutes || 30),
        mode: createDraft.mode,
        title: createDraft.title,
        adminNote: createDraft.adminNote,
      }),
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }
    setBusyKey("");
    if (!res.ok) {
      setMessage(parsed.error || t("errors.failedToCreate"));
      return;
    }
    setMessage(parsed.message || t("messages.roundCreated"));
    setCreateDraft(createDefaultDraft());
    emitDashboardLiveRefresh();
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.scheduled")} value={data?.summary.scheduled || 0} tone="info" />
        <KpiCard label={t("kpis.next24h")} value={data?.summary.next24h || 0} tone="warning" />
        <KpiCard label={t("kpis.needsMeetingLink")} value={data?.summary.needsMeetingLink || 0} tone="danger" />
        <KpiCard label={t("kpis.pendingAttendance")} value={data?.summary.pendingAttendance || 0} tone="warning" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/55">{t("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t("title")}</h3>
          <p className="mt-1 text-sm text-foreground/65">
            {t("subtitle", { minutes: data?.summary.reminderWindowMinutes || 60 })}
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="border-foreground/15 bg-background/60 pl-10 text-foreground placeholder:text-foreground/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  status === item
                    ? "border-sky-400/30 bg-sky-400/10 text-sky-800 dark:text-sky-100"
                    : "border-foreground/10 bg-background/60 text-foreground/70 hover:bg-background/80 hover:text-foreground"
                }`}
              >
                {t(`filters.status.${item}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,0.8fr))]">
          <Input
            value={createDraft.applicationId}
            onChange={(event) => setCreateDraft((current) => ({ ...current, applicationId: event.target.value.trim() }))}
            placeholder={t("create.applicationIdPlaceholder")}
            className="border-foreground/15 bg-background/70 text-foreground"
          />
          <input
            type="datetime-local"
            value={createDraft.scheduledAt}
            onChange={(event) => setCreateDraft((current) => ({ ...current, scheduledAt: event.target.value }))}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
          />
          <Input
            value={createDraft.durationMinutes}
            onChange={(event) => setCreateDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
            placeholder={t("create.durationPlaceholder")}
            className="border-foreground/15 bg-background/70 text-foreground"
          />
          <select
            value={createDraft.mode}
            onChange={(event) => setCreateDraft((current) => ({ ...current, mode: event.target.value as InterviewMode }))}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
          >
            <option value="VIRTUAL">{t("mode.VIRTUAL")}</option>
            <option value="IN_PERSON">{t("mode.IN_PERSON")}</option>
            <option value="PHONE">{t("mode.PHONE")}</option>
          </select>
          <Button type="button" disabled={busyKey === "create-round"} onClick={() => void createRound()}>
            {busyKey === "create-round" ? t("create.creating") : t("create.submit")}
          </Button>
          <div className="md:col-span-2 xl:col-span-5">
            <Input
              value={createDraft.title}
              onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value.slice(0, 120) }))}
              placeholder={t("create.titlePlaceholder")}
              className="border-foreground/15 bg-background/70 text-foreground"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            <textarea
              value={createDraft.adminNote}
              onChange={(event) => setCreateDraft((current) => ({ ...current, adminNote: event.target.value.slice(0, 800) }))}
              placeholder={t("create.notePlaceholder")}
              className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      </SectionCard>

      {grouped.length === 0 ? (
        <SectionCard className="border-dashed border-foreground/15 p-6 text-sm text-foreground/60">
          {t("empty")}
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateLabel, interviews]) => (
            <div key={dateLabel} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/65">
                <CalendarDays size={16} className="text-emerald-500" />
                <span>{dateLabel}</span>
              </div>
              <div className="space-y-4">
                {interviews.map((interview) => {
                  const draft = drafts[interview.id] || buildDraft(interview);
                  const missingMeetingLink =
                    interview.mode === "VIRTUAL" && !interview.meetingUrl && interview.status === "SCHEDULED";

                  return (
                    <SectionCard key={interview.id} elevated className="space-y-4 p-4 sm:p-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-foreground">
                              {t("card.roundTitle", {
                                round: interview.roundNumber,
                                title: interview.title || t("card.defaultRoundTitle"),
                              })}
                            </p>
                            <StatusBadge label={t(`status.${interview.status}`)} tone={toneForStatus(interview.status)} />
                            <StatusBadge
                              label={t(`attendance.${interview.attendanceStatus}`)}
                              tone={toneForAttendance(interview.attendanceStatus)}
                            />
                            {missingMeetingLink ? <StatusBadge label={t("card.meetingLinkMissing")} tone="danger" /> : null}
                          </div>
                          <p className="text-sm font-medium text-foreground/80">{interview.application.job.title}</p>
                          <p className="text-sm text-foreground/65">
                            {t("card.threadLine", {
                              candidate: interview.application.user.name || t("fallback.candidate"),
                              business: interview.application.job.business.name || t("fallback.business"),
                            })}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-foreground/55">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={12} />
                              {new Date(interview.scheduledAt).toLocaleString(locale)}
                            </span>
                            <span>{t("card.duration", { minutes: interview.durationMinutes })}</span>
                            <span>{t(`mode.${interview.mode}`)}</span>
                            <span>{interview.timezone}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setCreateDraft({
                              applicationId: interview.applicationId,
                              scheduledAt: draft.scheduledAt,
                              durationMinutes: draft.durationMinutes,
                              mode: draft.mode,
                              title: t("create.followupRoundTitle", { round: interview.roundNumber + 1 }),
                              adminNote: "",
                            })
                          }
                        >
                          {t("actions.prepareNextRound")}
                        </Button>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4 text-sm text-foreground/75">
                          <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.meetingDetails")}</p>
                          <div className="mt-3 space-y-2">
                            <p>{t("card.meetingProvider", { value: interview.meetingProvider || "-" })}</p>
                            <p className="break-all">{t("card.meetingLink", { value: interview.meetingUrl || t("card.notShared") })}</p>
                            <p>{t("card.locationNote", { value: interview.locationNote || "-" })}</p>
                            <p>{t("card.reminderStatus", { value: interview.reminderSentAt ? new Date(interview.reminderSentAt).toLocaleString(locale) : t("card.reminderPending") })}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4 text-sm text-foreground/75">
                          <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.notesAndScore")}</p>
                          <div className="mt-3 space-y-2">
                            <p>{t("card.adminNote", { value: interview.adminNote || "-" })}</p>
                            <p>{t("card.interviewerNotes", { value: interview.interviewerNotes || "-" })}</p>
                            {interview.scorecard ? (
                              <p>
                                {t("card.scoreLine", {
                                  overall: interview.scorecard.overall || "-",
                                  communication: interview.scorecard.communication || "-",
                                  roleFit: interview.scorecard.roleFit || "-",
                                  reliability: interview.scorecard.reliability || "-",
                                })}
                              </p>
                            ) : null}
                            {interview.scorecard?.summary ? <p>{interview.scorecard.summary}</p> : null}
                          </div>
                        </div>
                      </div>

                      <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          {t("actions.reschedule")}
                        </summary>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <input
                            type="datetime-local"
                            value={draft.scheduledAt}
                            onChange={(event) => updateDraft(interview.id, "scheduledAt", event.target.value)}
                            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
                          />
                          <Input
                            value={draft.durationMinutes}
                            onChange={(event) => updateDraft(interview.id, "durationMinutes", event.target.value)}
                            placeholder={t("card.durationPlaceholder")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <select
                            value={draft.mode}
                            onChange={(event) => updateDraft(interview.id, "mode", event.target.value)}
                            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
                          >
                            <option value="VIRTUAL">{t("mode.VIRTUAL")}</option>
                            <option value="IN_PERSON">{t("mode.IN_PERSON")}</option>
                            <option value="PHONE">{t("mode.PHONE")}</option>
                          </select>
                          <Input
                            value={draft.title}
                            onChange={(event) => updateDraft(interview.id, "title", event.target.value.slice(0, 120))}
                            placeholder={t("card.titlePlaceholder")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <div className="md:col-span-2 xl:col-span-4">
                            <textarea
                              value={draft.adminNote}
                              onChange={(event) => updateDraft(interview.id, "adminNote", event.target.value.slice(0, 800))}
                              placeholder={t("card.adminNotePlaceholder")}
                              className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            />
                          </div>
                          <div className="md:col-span-2 xl:col-span-4">
                            <textarea
                              value={draft.rescheduleReason}
                              onChange={(event) => updateDraft(interview.id, "rescheduleReason", event.target.value.slice(0, 500))}
                              placeholder={t("card.rescheduleReasonPlaceholder")}
                              className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            disabled={busyKey === interview.id}
                            onClick={() =>
                              void patchInterview(interview.id, {
                                action: "RESCHEDULE",
                                scheduledAt: draft.scheduledAt,
                                durationMinutes: Number(draft.durationMinutes || 30),
                                mode: draft.mode,
                                title: draft.title,
                                adminNote: draft.adminNote,
                                rescheduleReason: draft.rescheduleReason,
                              })
                            }
                          >
                            {busyKey === interview.id ? t("actions.saving") : t("actions.saveReschedule")}
                          </Button>
                        </div>
                      </details>

                      <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          {t("actions.completeRound")}
                        </summary>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <select
                            value={draft.attendanceStatus}
                            onChange={(event) => updateDraft(interview.id, "attendanceStatus", event.target.value)}
                            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
                          >
                            <option value="PENDING">{t("attendance.PENDING")}</option>
                            <option value="ATTENDED">{t("attendance.ATTENDED")}</option>
                            <option value="NO_SHOW">{t("attendance.NO_SHOW")}</option>
                          </select>
                          <Input
                            value={draft.overall}
                            onChange={(event) => updateDraft(interview.id, "overall", event.target.value)}
                            placeholder={t("score.overall")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <Input
                            value={draft.communication}
                            onChange={(event) => updateDraft(interview.id, "communication", event.target.value)}
                            placeholder={t("score.communication")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <Input
                            value={draft.roleFit}
                            onChange={(event) => updateDraft(interview.id, "roleFit", event.target.value)}
                            placeholder={t("score.roleFit")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <Input
                            value={draft.reliability}
                            onChange={(event) => updateDraft(interview.id, "reliability", event.target.value)}
                            placeholder={t("score.reliability")}
                            className="border-foreground/15 bg-background/70 text-foreground"
                          />
                          <div className="md:col-span-2 xl:col-span-4">
                            <textarea
                              value={draft.interviewerNotes}
                              onChange={(event) => updateDraft(interview.id, "interviewerNotes", event.target.value.slice(0, 1200))}
                              placeholder={t("card.interviewerNotesPlaceholder")}
                              className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            />
                          </div>
                          <div className="md:col-span-2 xl:col-span-4">
                            <textarea
                              value={draft.summary}
                              onChange={(event) => updateDraft(interview.id, "summary", event.target.value.slice(0, 1000))}
                              placeholder={t("score.summaryPlaceholder")}
                              className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busyKey === interview.id}
                            onClick={() =>
                              void patchInterview(interview.id, {
                                action: "MARK_ATTENDANCE",
                                attendanceStatus: draft.attendanceStatus,
                              })
                            }
                          >
                            {busyKey === interview.id ? t("actions.saving") : t("actions.markAttendance")}
                          </Button>
                          <Button
                            type="button"
                            disabled={busyKey === interview.id}
                            onClick={() =>
                              void patchInterview(interview.id, {
                                action: "COMPLETE",
                                attendanceStatus: draft.attendanceStatus,
                                interviewerNotes: draft.interviewerNotes,
                                adminNote: draft.adminNote,
                                scorecard: {
                                  overall: draft.overall,
                                  communication: draft.communication,
                                  roleFit: draft.roleFit,
                                  reliability: draft.reliability,
                                  summary: draft.summary,
                                },
                              })
                            }
                          >
                            {busyKey === interview.id ? t("actions.saving") : t("actions.completeRound")}
                          </Button>
                        </div>
                      </details>

                      <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          {t("actions.cancelRound")}
                        </summary>
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={draft.cancelledReason}
                            onChange={(event) => updateDraft(interview.id, "cancelledReason", event.target.value.slice(0, 500))}
                            placeholder={t("card.cancelReasonPlaceholder")}
                            className="min-h-[88px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busyKey === interview.id}
                              onClick={() =>
                                void patchInterview(interview.id, {
                                  action: "CANCEL",
                                  cancelledReason: draft.cancelledReason,
                                })
                              }
                            >
                              {busyKey === interview.id ? t("actions.saving") : t("actions.cancelRound")}
                            </Button>
                          </div>
                        </div>
                      </details>

                      {interview.application.status === "HIRED" || interview.application.status === "JOINED" ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            disabled={busyKey === interview.id}
                            onClick={() => void patchInterview(interview.id, { action: "CONFIRM_JOINED" })}
                          >
                            {busyKey === interview.id ? t("actions.saving") : t("actions.confirmJoined")}
                          </Button>
                        </div>
                      ) : null}
                    </SectionCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

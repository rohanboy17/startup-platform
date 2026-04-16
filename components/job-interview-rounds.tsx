"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

export type JobInterviewRound = {
  id: string;
  roundNumber: number;
  title: string | null;
  status: string;
  mode: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  locationNote: string | null;
  meetingProvider: string | null;
  meetingUrl: string | null;
  adminNote: string | null;
  interviewerNotes: string | null;
  scorecard: Record<string, unknown> | null;
  rescheduledAt: string | null;
  rescheduleReason: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
  attendanceStatus: string;
  attendedAt: string | null;
  attendanceMarkedAt: string | null;
  meetingSharedAt: string | null;
  reminderSentAt: string | null;
};

type MeetingDraft = {
  meetingProvider: string;
  meetingUrl: string;
  locationNote: string;
};

export default function JobInterviewRounds({
  rounds,
  locale,
  title,
  emptyLabel,
  labels,
  canEditMeetingDetails = false,
  meetingDrafts = {},
  busyInterviewId = "",
  onMeetingDraftChange,
  onSaveMeetingDetails,
}: {
  rounds: JobInterviewRound[];
  locale: string;
  title: string;
  emptyLabel: string;
  labels: {
    statusLabel: (status: string) => string;
    toneForStatus: (status: string) => "success" | "warning" | "danger" | "info" | "neutral";
    roundLabel: (roundNumber: number, title?: string | null) => string;
    modeLabel: (mode: string) => string;
    scheduledAt: (value: string) => string;
    durationLabel: (minutes: number) => string;
    timezoneLabel: (value: string) => string;
    adminNote: string;
    interviewerNotes: string;
    attendanceLabel: (status: string) => string;
    meetingProvider: string;
    meetingLink: string;
    locationNote: string;
    noMeetingLink: string;
    rescheduledReason: string;
    cancelledReason: string;
    completedAt: string;
    saveMeetingDetails: string;
    savingMeetingDetails: string;
    updateMeetingHelp: string;
  };
  canEditMeetingDetails?: boolean;
  meetingDrafts?: Record<string, MeetingDraft>;
  busyInterviewId?: string;
  onMeetingDraftChange?: (interviewId: string, field: keyof MeetingDraft, value: string) => void;
  onSaveMeetingDetails?: (interviewId: string) => void;
}) {
  if (rounds.length === 0) {
    return (
      <SectionCard className="border border-dashed border-foreground/15 bg-foreground/[0.03] p-4 text-sm text-foreground/60">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{title}</p>
        <p className="mt-3">{emptyLabel}</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{title}</p>
      {rounds.map((round) => {
        const draft = meetingDrafts[round.id] || {
          meetingProvider: round.meetingProvider || "",
          meetingUrl: round.meetingUrl || "",
          locationNote: round.locationNote || "",
        };

        return (
          <div key={round.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {labels.roundLabel(round.roundNumber, round.title)}
                  </p>
                  <StatusBadge
                    label={labels.statusLabel(round.status)}
                    tone={labels.toneForStatus(round.status)}
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                  <span>{labels.modeLabel(round.mode)}</span>
                  <span>{labels.scheduledAt(round.scheduledAt)}</span>
                  <span>{labels.durationLabel(round.durationMinutes)}</span>
                  <span>{labels.timezoneLabel(round.timezone)}</span>
                </div>
              </div>
              <div className="text-xs text-foreground/55">
                {labels.attendanceLabel(round.attendanceStatus)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">{labels.adminNote}</p>
                <p className="mt-2 text-sm text-foreground/75">{round.adminNote || "-"}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">{labels.interviewerNotes}</p>
                <p className="mt-2 text-sm text-foreground/75">{round.interviewerNotes || "-"}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3 text-sm text-foreground/75">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">{labels.meetingProvider}</p>
                <p className="mt-2">{round.meetingProvider || "-"}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-foreground/55">{labels.meetingLink}</p>
                {round.meetingUrl ? (
                  <Link
                    href={round.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block break-all text-sm text-sky-700 underline dark:text-sky-300"
                  >
                    {round.meetingUrl}
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-foreground/60">{labels.noMeetingLink}</p>
                )}
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3 text-sm text-foreground/75">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">{labels.locationNote}</p>
                <p className="mt-2">{round.locationNote || "-"}</p>
              </div>
            </div>

            {round.rescheduleReason ? (
              <p className="mt-3 text-xs text-foreground/60">
                {labels.rescheduledReason}: {round.rescheduleReason}
              </p>
            ) : null}
            {round.cancelledReason ? (
              <p className="mt-2 text-xs text-foreground/60">
                {labels.cancelledReason}: {round.cancelledReason}
              </p>
            ) : null}
            {round.completedAt ? (
              <p className="mt-2 text-xs text-foreground/60">
                {labels.completedAt}: {new Date(round.completedAt).toLocaleString(locale)}
              </p>
            ) : null}

            {canEditMeetingDetails && onMeetingDraftChange && onSaveMeetingDetails && round.status === "SCHEDULED" ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-foreground/10 bg-background/75 p-3">
                <p className="text-xs text-foreground/60">{labels.updateMeetingHelp}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={draft.meetingProvider}
                    onChange={(event) => onMeetingDraftChange(round.id, "meetingProvider", event.target.value)}
                    placeholder={labels.meetingProvider}
                    className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
                  />
                  <input
                    value={draft.meetingUrl}
                    onChange={(event) => onMeetingDraftChange(round.id, "meetingUrl", event.target.value)}
                    placeholder="https://"
                    className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground outline-none"
                  />
                </div>
                <textarea
                  value={draft.locationNote}
                  onChange={(event) => onMeetingDraftChange(round.id, "locationNote", event.target.value)}
                  placeholder={labels.locationNote}
                  className="min-h-[96px] w-full rounded-xl border border-foreground/15 bg-background/70 px-3 py-2 text-sm text-foreground outline-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyInterviewId === round.id}
                    onClick={() => onSaveMeetingDetails(round.id)}
                  >
                    {busyInterviewId === round.id ? labels.savingMeetingDetails : labels.saveMeetingDetails}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

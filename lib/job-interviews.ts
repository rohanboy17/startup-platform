type ScorecardInput = {
  overall?: unknown;
  communication?: unknown;
  roleFit?: unknown;
  reliability?: unknown;
  summary?: unknown;
};

export const JOB_INTERVIEW_REMINDER_LEAD_MINUTES = 60;
export const JOB_INTERVIEW_REMINDER_SWEEP_MINUTES = Math.max(
  JOB_INTERVIEW_REMINDER_LEAD_MINUTES,
  Number(process.env.JOB_INTERVIEW_REMINDER_SWEEP_MINUTES ?? 26 * 60)
);

function clampScore(value: unknown) {
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  if (next < 1 || next > 5) return null;
  return Math.round(next);
}

export function normalizeInterviewText(input: unknown, max = 800) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, max);
}

export function normalizeMeetingUrl(input: unknown) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeInterviewScorecard(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as ScorecardInput;
  const summary = normalizeInterviewText(value.summary, 1000);
  const scorecard = {
    overall: clampScore(value.overall),
    communication: clampScore(value.communication),
    roleFit: clampScore(value.roleFit),
    reliability: clampScore(value.reliability),
    summary: summary || null,
  };

  if (!scorecard.overall && !scorecard.communication && !scorecard.roleFit && !scorecard.reliability && !scorecard.summary) {
    return null;
  }

  return scorecard;
}

export function nextInterviewAtFromRounds(
  interviews: Array<{ status: string; scheduledAt: Date; cancelledAt?: Date | null }>
) {
  const active = interviews
    .filter((item) => item.status === "SCHEDULED" && !item.cancelledAt)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

  return active?.scheduledAt ?? null;
}

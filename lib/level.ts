import type { UserLevel } from "@prisma/client";

export function getLevelFromApprovedCount(count: number): UserLevel {
  if (count >= 100) return "L5";
  if (count >= 50) return "L4";
  if (count >= 20) return "L3";
  if (count >= 10) return "L2";
  return "L1";
}

export function getCurrentIstResetBoundary(now = new Date()): Date {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");

  if (!year || !month || !day) {
    return new Date(now);
  }

  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}

export function shouldResetDailyCounter(lastLevelResetAt: Date, now = new Date()) {
  return lastLevelResetAt.getTime() < getCurrentIstResetBoundary(now).getTime();
}

export function getDailyResetState(lastLevelResetAt: Date, now = new Date()) {
  const resetAt = getCurrentIstResetBoundary(now);

  return {
    resetAt,
    resetNeeded: lastLevelResetAt.getTime() < resetAt.getTime(),
  };
}

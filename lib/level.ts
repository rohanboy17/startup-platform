import type { UserLevel } from "@prisma/client";

export function getLevelFromDailySubmits(count: number): UserLevel {
  if (count >= 100) return "L5";
  if (count >= 50) return "L4";
  if (count >= 20) return "L3";
  if (count >= 10) return "L2";
  return "L1";
}

export function shouldResetLevel(lastLevelResetAt: Date, now = new Date()) {
  return now.getTime() - lastLevelResetAt.getTime() >= 24 * 60 * 60 * 1000;
}

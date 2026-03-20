import { generateFakeBase, generateLiveBase, getMetricsDayKey } from "@/lib/fake-metrics";

type HeroDisplayMetrics = ReturnType<typeof generateFakeBase>;
type LiveDisplayMetrics = ReturnType<typeof generateLiveBase>;

let cachedDayKey = "";
let cachedHeroBase: HeroDisplayMetrics | null = null;
let cachedLiveBase: LiveDisplayMetrics | null = null;
let cachedHeroMaximums: HeroDisplayMetrics | null = null;
let cachedLiveMaximums: LiveDisplayMetrics | null = null;

function ensureDayCache(dayKey = getMetricsDayKey()) {
  if (cachedDayKey === dayKey) return dayKey;

  cachedDayKey = dayKey;
  cachedHeroBase = generateFakeBase(dayKey);
  cachedLiveBase = generateLiveBase(dayKey);
  cachedHeroMaximums = null;
  cachedLiveMaximums = null;
  return dayKey;
}

export function getStableHeroBase(dayKey = getMetricsDayKey()) {
  ensureDayCache(dayKey);
  return cachedHeroBase ?? generateFakeBase(dayKey);
}

export function getStableLiveBase(dayKey = getMetricsDayKey()) {
  ensureDayCache(dayKey);
  return cachedLiveBase ?? generateLiveBase(dayKey);
}

export function rememberHeroMaximums(next: HeroDisplayMetrics, dayKey = getMetricsDayKey()) {
  ensureDayCache(dayKey);
  if (!cachedHeroMaximums) {
    cachedHeroMaximums = next;
    return next;
  }

  cachedHeroMaximums = {
    totalUsers: Math.max(cachedHeroMaximums.totalUsers, next.totalUsers),
    tasksCompleted: Math.max(cachedHeroMaximums.tasksCompleted, next.tasksCompleted),
    totalPayout: Math.max(cachedHeroMaximums.totalPayout, next.totalPayout),
    businessAccounts: Math.max(cachedHeroMaximums.businessAccounts, next.businessAccounts),
    totalCampaigns: Math.max(cachedHeroMaximums.totalCampaigns, next.totalCampaigns),
  };

  return cachedHeroMaximums;
}

export function rememberLiveMaximums(next: LiveDisplayMetrics, dayKey = getMetricsDayKey()) {
  ensureDayCache(dayKey);
  if (!cachedLiveMaximums) {
    cachedLiveMaximums = next;
    return next;
  }

  cachedLiveMaximums = {
    activeOnlineUsers: Math.max(cachedLiveMaximums.activeOnlineUsers, next.activeOnlineUsers),
    activeOnlineBusinesses: Math.max(
      cachedLiveMaximums.activeOnlineBusinesses,
      next.activeOnlineBusinesses
    ),
    liveTasks: Math.max(cachedLiveMaximums.liveTasks, next.liveTasks),
    liveWithdraws: Math.max(cachedLiveMaximums.liveWithdraws, next.liveWithdraws),
  };

  return cachedLiveMaximums;
}

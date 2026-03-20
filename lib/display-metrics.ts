import { getMetricsDayKey } from "@/lib/fake-metrics";
import {
  getStableHeroBase,
  getStableLiveBase,
  rememberHeroMaximums,
  rememberLiveMaximums,
} from "@/lib/fake-metrics-store";

export type HeroMetrics = {
  totalPayout: number;
  totalUsers: number;
  businessAccounts: number;
  totalCampaigns: number;
  tasksCompleted: number;
};

export type LiveStats = {
  activeOnlineUsers: number;
  activeOnlineBusinesses: number;
  liveTasks: number;
  liveWithdraws: number;
};

export function getDisplayMetrics(real: HeroMetrics, dayKey = getMetricsDayKey()) {
  const base = getStableHeroBase(dayKey);

  return rememberHeroMaximums(
    {
      totalPayout: Math.floor(base.totalPayout + real.totalPayout),
      totalUsers: base.totalUsers + real.totalUsers,
      businessAccounts: base.businessAccounts + real.businessAccounts,
      totalCampaigns: base.totalCampaigns + real.totalCampaigns,
      tasksCompleted: base.tasksCompleted + real.tasksCompleted,
    },
    dayKey
  );
}

export function getDisplayLiveStats(real: LiveStats, dayKey = getMetricsDayKey()) {
  const base = getStableLiveBase(dayKey);

  return rememberLiveMaximums(
    {
      activeOnlineUsers: base.activeOnlineUsers + real.activeOnlineUsers,
      activeOnlineBusinesses: base.activeOnlineBusinesses + real.activeOnlineBusinesses,
      liveTasks: base.liveTasks + real.liveTasks,
      liveWithdraws: base.liveWithdraws + real.liveWithdraws,
    },
    dayKey
  );
}

export function mergeMetricMaximums<T extends Record<string, number>>(current: T, incoming: T) {
  const merged = { ...incoming } as T;
  (Object.keys(incoming) as Array<keyof T>).forEach((key) => {
    merged[key] = Math.max(current[key], incoming[key]) as T[keyof T];
  });
  return merged;
}

const HERO_BASE_RANGES = {
  totalUsers: [500, 2000],
  tasksCompleted: [1000, 5000],
  totalPayout: [10000, 50000],
  businessAccounts: [50, 200],
  totalCampaigns: [20, 120],
} as const;

const LIVE_BASE_RANGES = {
  activeOnlineUsers: [10, 50],
  activeOnlineBusinesses: [5, 20],
  liveTasks: [3, 15],
  liveWithdraws: [1, 10],
} as const;

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandomInt(seed: string, min: number, max: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const span = upper - lower + 1;
  return lower + (hashString(seed) % span);
}

export function getMetricsDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function generateFakeBase(dayKey = getMetricsDayKey()) {
  return {
    totalUsers: seededRandomInt(`${dayKey}:hero:users`, ...HERO_BASE_RANGES.totalUsers),
    tasksCompleted: seededRandomInt(`${dayKey}:hero:tasks`, ...HERO_BASE_RANGES.tasksCompleted),
    totalPayout: seededRandomInt(`${dayKey}:hero:payout`, ...HERO_BASE_RANGES.totalPayout),
    businessAccounts: seededRandomInt(`${dayKey}:hero:business`, ...HERO_BASE_RANGES.businessAccounts),
    totalCampaigns: seededRandomInt(`${dayKey}:hero:campaigns`, ...HERO_BASE_RANGES.totalCampaigns),
  };
}

export function generateLiveBase(dayKey = getMetricsDayKey()) {
  return {
    activeOnlineUsers: seededRandomInt(`${dayKey}:live:users`, ...LIVE_BASE_RANGES.activeOnlineUsers),
    activeOnlineBusinesses: seededRandomInt(
      `${dayKey}:live:businesses`,
      ...LIVE_BASE_RANGES.activeOnlineBusinesses
    ),
    liveTasks: seededRandomInt(`${dayKey}:live:campaigns`, ...LIVE_BASE_RANGES.liveTasks),
    liveWithdraws: seededRandomInt(`${dayKey}:live:withdrawals`, ...LIVE_BASE_RANGES.liveWithdraws),
  };
}

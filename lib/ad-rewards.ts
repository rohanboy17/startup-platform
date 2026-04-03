import type { AppSettings } from "@/lib/system-settings";

export const DEFAULT_AD_PERK_CREDITS_PER_VIEW = 1;
export const DEFAULT_AD_MAX_VIEWS_PER_DAY = 5;
export const DEFAULT_AD_COOLDOWN_SECONDS = 60;
export const DEFAULT_AD_WATCH_SECONDS = 20;
export const DEFAULT_RECOMMENDATION_BOOST_COST = 3;
export const DEFAULT_RECOMMENDATION_BOOST_HOURS = 24;
const AD_SESSION_GRACE_SECONDS = 15 * 60;

export function getIndiaDayStart(input = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(input).split("-");
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}

export function getIndiaDayEnd(input = new Date()) {
  return new Date(getIndiaDayStart(input).getTime() + 24 * 60 * 60 * 1000);
}

export function resolveAdRewardSettings(settings: Pick<
  AppSettings,
  "adRewardPerView" | "adMaxViewsPerDay" | "adCooldownSeconds" | "adWatchSeconds"
>) {
  return {
    perkCreditsPerAd:
      typeof settings.adRewardPerView === "number" && settings.adRewardPerView > 0
        ? Math.max(1, Math.floor(settings.adRewardPerView))
        : DEFAULT_AD_PERK_CREDITS_PER_VIEW,
    maxAdsPerDay:
      typeof settings.adMaxViewsPerDay === "number" && settings.adMaxViewsPerDay > 0
        ? Math.max(1, Math.floor(settings.adMaxViewsPerDay))
        : DEFAULT_AD_MAX_VIEWS_PER_DAY,
    cooldownSeconds:
      typeof settings.adCooldownSeconds === "number" && settings.adCooldownSeconds >= 0
        ? Math.max(0, Math.floor(settings.adCooldownSeconds))
        : DEFAULT_AD_COOLDOWN_SECONDS,
    watchSeconds:
      typeof settings.adWatchSeconds === "number" && settings.adWatchSeconds >= 5
        ? Math.max(5, Math.floor(settings.adWatchSeconds))
        : DEFAULT_AD_WATCH_SECONDS,
  };
}

export function getAdSessionExpiry(availableAt: Date) {
  return new Date(availableAt.getTime() + AD_SESSION_GRACE_SECONDS * 1000);
}

export function getRecommendationBoostExpiry(startAt = new Date()) {
  return new Date(startAt.getTime() + DEFAULT_RECOMMENDATION_BOOST_HOURS * 60 * 60 * 1000);
}

export function isRecommendationBoostActive(expiresAt: Date | null | undefined, now = new Date()) {
  return Boolean(expiresAt && expiresAt.getTime() > now.getTime());
}

export function getSecondsRemaining(targetAt: Date | null, now = new Date()) {
  if (!targetAt) return 0;
  return Math.max(0, Math.ceil((targetAt.getTime() - now.getTime()) / 1000));
}

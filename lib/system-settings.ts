import { prisma } from "@/lib/prisma";
import { DEFAULT_TASK_CATEGORIES, normalizeTaskCategoryConfig, type TaskCategoryOption } from "@/lib/task-categories";

export type AppSettings = {
  commissionRateDefault: number;
  withdrawalFeeRate: number;
  minWithdrawalAmount: number;
  fundingFeeRate: number;
  businessRefundFeeRate: number;
  levelResetHours: number;
  maintenanceMode: boolean;
  adRewardPerView: number;
  adMaxViewsPerDay: number;
  adCooldownSeconds: number;
  adWatchSeconds: number;
  taskCategories: TaskCategoryOption[];
};

const DEFAULT_SETTINGS: AppSettings = {
  commissionRateDefault: 0.3,
  withdrawalFeeRate: Number(process.env.WITHDRAWAL_COMMISSION_RATE ?? 0.02),
  minWithdrawalAmount: Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 100),
  fundingFeeRate: 0,
  businessRefundFeeRate: 0.03,
  levelResetHours: 24,
  maintenanceMode: false,
  adRewardPerView: 0.5,
  adMaxViewsPerDay: 5,
  adCooldownSeconds: 60,
  adWatchSeconds: 20,
  taskCategories: DEFAULT_TASK_CATEGORIES,
};

export async function getAppSettings(): Promise<AppSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "app.core" } });
  if (!row) return DEFAULT_SETTINGS;

  const raw = row.value as Partial<AppSettings>;
  return {
    commissionRateDefault:
      typeof raw.commissionRateDefault === "number"
        ? Math.min(Math.max(raw.commissionRateDefault, 0), 0.9)
        : DEFAULT_SETTINGS.commissionRateDefault,
    minWithdrawalAmount:
      typeof raw.minWithdrawalAmount === "number" && raw.minWithdrawalAmount > 0
        ? raw.minWithdrawalAmount
        : DEFAULT_SETTINGS.minWithdrawalAmount,
    withdrawalFeeRate:
      typeof raw.withdrawalFeeRate === "number"
        ? Math.min(Math.max(raw.withdrawalFeeRate, 0), 0.5)
        : DEFAULT_SETTINGS.withdrawalFeeRate,
    fundingFeeRate:
      typeof raw.fundingFeeRate === "number"
        ? Math.min(Math.max(raw.fundingFeeRate, 0), 0.5)
        : DEFAULT_SETTINGS.fundingFeeRate,
    businessRefundFeeRate:
      typeof raw.businessRefundFeeRate === "number"
        ? Math.min(Math.max(raw.businessRefundFeeRate, 0), 0.5)
        : DEFAULT_SETTINGS.businessRefundFeeRate,
    levelResetHours:
      typeof raw.levelResetHours === "number" && raw.levelResetHours >= 1
        ? Math.min(Math.max(raw.levelResetHours, 1), 168)
        : DEFAULT_SETTINGS.levelResetHours,
    maintenanceMode:
      typeof raw.maintenanceMode === "boolean" ? raw.maintenanceMode : DEFAULT_SETTINGS.maintenanceMode,
    adRewardPerView:
      typeof raw.adRewardPerView === "number" && raw.adRewardPerView > 0
        ? Math.min(Math.max(raw.adRewardPerView, 0.1), 100)
        : DEFAULT_SETTINGS.adRewardPerView,
    adMaxViewsPerDay:
      typeof raw.adMaxViewsPerDay === "number" && raw.adMaxViewsPerDay >= 1
        ? Math.min(Math.max(Math.floor(raw.adMaxViewsPerDay), 1), 100)
        : DEFAULT_SETTINGS.adMaxViewsPerDay,
    adCooldownSeconds:
      typeof raw.adCooldownSeconds === "number" && raw.adCooldownSeconds >= 0
        ? Math.min(Math.max(Math.floor(raw.adCooldownSeconds), 0), 3600)
        : DEFAULT_SETTINGS.adCooldownSeconds,
    adWatchSeconds:
      typeof raw.adWatchSeconds === "number" && raw.adWatchSeconds >= 5
        ? Math.min(Math.max(Math.floor(raw.adWatchSeconds), 5), 300)
        : DEFAULT_SETTINGS.adWatchSeconds,
    taskCategories: normalizeTaskCategoryConfig(raw.taskCategories),
  };
}

export async function updateAppSettings(value: Partial<AppSettings>) {
  const current = await getAppSettings();
  const merged: AppSettings = {
    ...current,
    ...value,
  };

  return prisma.systemSetting.upsert({
    where: { key: "app.core" },
    update: { value: merged },
    create: { key: "app.core", value: merged },
  });
}

export function getRequiredEnvChecks() {
  const checks = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL),
    RAZORPAY_KEY_ID: Boolean(process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: Boolean(process.env.RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_PASS: Boolean(process.env.SMTP_PASS),
  };

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  return { checks, missing };
}

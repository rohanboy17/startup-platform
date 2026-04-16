import { prisma } from "@/lib/prisma";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  getJobCategoryOptions,
  getJobWorkModeOptions,
  getLaunchSafeWorkTaxonomy,
  getProfileWorkModeOptions,
  getTaskCategoryOptions,
  INTERNSHIP_PREFERENCE_OPTIONS,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  normalizeCampaignCategoryOptions,
  normalizeTaxonomySelectOptions,
  normalizeWorkModeOptions,
  type CampaignCategoryOption,
  type JobCategoryOption,
  type TaskCategoryOption,
  type TaxonomySelectOption,
  type WorkModeOption,
  type WorkTaxonomyCategory,
  WORK_MODE_OPTIONS,
  WORK_TIME_OPTIONS,
  WORKING_PREFERENCE_OPTIONS,
  WORK_TAXONOMY_CATEGORIES,
} from "@/lib/work-taxonomy";

export type AppSettings = {
  commissionRateDefault: number;
  withdrawalFeeRate: number;
  minWithdrawalAmount: number;
  fundingFeeRate: number;
  businessRefundFeeRate: number;
  levelResetHours: number;
  maintenanceMode: boolean;
  bonusAdsEnabled: boolean;
  adRewardPerView: number;
  adMaxViewsPerDay: number;
  adCooldownSeconds: number;
  adWatchSeconds: number;
  workTaxonomy: WorkTaxonomyCategory[];
  campaignCategoryOptions: CampaignCategoryOption[];
  taskCategories: TaskCategoryOption[];
  jobCategories: JobCategoryOption[];
  workModeOptions: WorkModeOption[];
  profileWorkModeOptions: TaxonomySelectOption[];
  jobWorkModeOptions: TaxonomySelectOption[];
  workTimeOptions: TaxonomySelectOption[];
  workingPreferenceOptions: TaxonomySelectOption[];
  internshipPreferenceOptions: TaxonomySelectOption[];
  jobEmploymentTypeOptions: TaxonomySelectOption[];
  jobPayUnitOptions: TaxonomySelectOption[];
};

export function isBonusAdsLockedForLaunch() {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_BONUS_ADS_PUBLIC !== "true";
}

const DEFAULT_SETTINGS: AppSettings = {
  commissionRateDefault: 0.3,
  withdrawalFeeRate: Number(process.env.WITHDRAWAL_COMMISSION_RATE ?? 0.02),
  minWithdrawalAmount: Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 100),
  fundingFeeRate: 0,
  businessRefundFeeRate: 0.03,
  levelResetHours: 24,
  maintenanceMode: false,
  bonusAdsEnabled: false,
  adRewardPerView: 1,
  adMaxViewsPerDay: 5,
  adCooldownSeconds: 60,
  adWatchSeconds: 20,
  workTaxonomy: WORK_TAXONOMY_CATEGORIES,
  campaignCategoryOptions: CAMPAIGN_CATEGORY_OPTIONS,
  taskCategories: getTaskCategoryOptions(WORK_TAXONOMY_CATEGORIES),
  jobCategories: getJobCategoryOptions(WORK_TAXONOMY_CATEGORIES),
  workModeOptions: WORK_MODE_OPTIONS,
  profileWorkModeOptions: getProfileWorkModeOptions(WORK_MODE_OPTIONS),
  jobWorkModeOptions: getJobWorkModeOptions(WORK_MODE_OPTIONS),
  workTimeOptions: WORK_TIME_OPTIONS,
  workingPreferenceOptions: WORKING_PREFERENCE_OPTIONS,
  internshipPreferenceOptions: INTERNSHIP_PREFERENCE_OPTIONS,
  jobEmploymentTypeOptions: JOB_EMPLOYMENT_TYPE_OPTIONS,
  jobPayUnitOptions: JOB_PAY_UNIT_OPTIONS,
};

function buildDerivedSettings(raw: Partial<AppSettings>) {
  const workTaxonomy = getLaunchSafeWorkTaxonomy(raw.workTaxonomy);
  const campaignCategoryOptions = normalizeCampaignCategoryOptions(raw.campaignCategoryOptions);
  const workModeOptions = normalizeWorkModeOptions(raw.workModeOptions);
  const workTimeOptions = normalizeTaxonomySelectOptions(raw.workTimeOptions, WORK_TIME_OPTIONS);
  const workingPreferenceOptions = normalizeTaxonomySelectOptions(
    raw.workingPreferenceOptions,
    WORKING_PREFERENCE_OPTIONS
  );
  const internshipPreferenceOptions = normalizeTaxonomySelectOptions(
    raw.internshipPreferenceOptions,
    INTERNSHIP_PREFERENCE_OPTIONS
  );
  const jobEmploymentTypeOptions = normalizeTaxonomySelectOptions(
    raw.jobEmploymentTypeOptions,
    JOB_EMPLOYMENT_TYPE_OPTIONS
  );
  const jobPayUnitOptions = normalizeTaxonomySelectOptions(raw.jobPayUnitOptions, JOB_PAY_UNIT_OPTIONS);
  return {
    workTaxonomy,
    campaignCategoryOptions,
    taskCategories: getTaskCategoryOptions(workTaxonomy),
    jobCategories: getJobCategoryOptions(workTaxonomy),
    workModeOptions,
    profileWorkModeOptions: getProfileWorkModeOptions(workModeOptions),
    jobWorkModeOptions: getJobWorkModeOptions(workModeOptions),
    workTimeOptions,
    workingPreferenceOptions,
    internshipPreferenceOptions,
    jobEmploymentTypeOptions,
    jobPayUnitOptions,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "app.core" } });
  if (!row) return DEFAULT_SETTINGS;

  const raw = row.value as Partial<AppSettings>;
  const bonusAdsLockedForLaunch = isBonusAdsLockedForLaunch();
  const derived = buildDerivedSettings(raw);
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
    bonusAdsEnabled:
      bonusAdsLockedForLaunch
        ? false
        : typeof raw.bonusAdsEnabled === "boolean"
          ? raw.bonusAdsEnabled
          : DEFAULT_SETTINGS.bonusAdsEnabled,
    adRewardPerView:
      typeof raw.adRewardPerView === "number" && raw.adRewardPerView > 0
        ? Math.min(Math.max(Math.floor(raw.adRewardPerView), 1), 25)
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
    ...derived,
  };
}

export async function updateAppSettings(value: Partial<AppSettings>) {
  const current = await getAppSettings();
  const bonusAdsLockedForLaunch = isBonusAdsLockedForLaunch();
  const mergedBase: Partial<AppSettings> = {
    ...current,
    ...value,
    bonusAdsEnabled: bonusAdsLockedForLaunch ? false : Boolean(value.bonusAdsEnabled ?? current.bonusAdsEnabled),
  };
  const derived = buildDerivedSettings(mergedBase);
  const merged: AppSettings = {
    ...current,
    ...value,
    bonusAdsEnabled: mergedBase.bonusAdsEnabled as boolean,
    ...derived,
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

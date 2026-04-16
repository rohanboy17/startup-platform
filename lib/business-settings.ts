import { prisma } from "@/lib/prisma";

export type BusinessSettings = {
  profileImageUrl: string;
  brandName: string;
  companyName: string;
  contactEmail: string;
  supportContact: string;
  defaultPayoutUpiId: string;
  defaultPayoutUpiName: string;
  billingDetails: string;
  refundPreference: string;
  notificationPreferences: {
    campaignStatus: boolean;
    budgetAlerts: boolean;
    paymentAlerts: boolean;
    rejectionSpike: boolean;
  };
};

function keyFor(userId: string) {
  return `business.settings.${userId}`;
}

export function getDefaultBusinessSettings(params: { name?: string | null; email?: string | null }): BusinessSettings {
  return {
    profileImageUrl: "",
    brandName: params.name?.trim() || "FreeEarnHub Business",
    companyName: params.name?.trim() || "",
    contactEmail: params.email?.trim() || "",
    supportContact: "",
    defaultPayoutUpiId: "",
    defaultPayoutUpiName: "",
    billingDetails: "",
    refundPreference: "Refund unused wallet balance with zero business fee during launch.",
    notificationPreferences: {
      campaignStatus: true,
      budgetAlerts: true,
      paymentAlerts: true,
      rejectionSpike: true,
    },
  };
}

export async function getBusinessSettings(userId: string, fallback: { name?: string | null; email?: string | null }) {
  const row = await prisma.systemSetting.findUnique({ where: { key: keyFor(userId) } });
  const defaults = getDefaultBusinessSettings(fallback);

  if (!row) return defaults;

  const raw = row.value as Partial<BusinessSettings>;
  return {
    profileImageUrl:
      typeof raw.profileImageUrl === "string" ? raw.profileImageUrl : defaults.profileImageUrl,
    brandName: typeof raw.brandName === "string" ? raw.brandName : defaults.brandName,
    companyName: typeof raw.companyName === "string" ? raw.companyName : defaults.companyName,
    contactEmail: typeof raw.contactEmail === "string" ? raw.contactEmail : defaults.contactEmail,
    supportContact: typeof raw.supportContact === "string" ? raw.supportContact : defaults.supportContact,
    defaultPayoutUpiId:
      typeof raw.defaultPayoutUpiId === "string"
        ? raw.defaultPayoutUpiId
        : defaults.defaultPayoutUpiId,
    defaultPayoutUpiName:
      typeof raw.defaultPayoutUpiName === "string"
        ? raw.defaultPayoutUpiName
        : defaults.defaultPayoutUpiName,
    billingDetails: typeof raw.billingDetails === "string" ? raw.billingDetails : defaults.billingDetails,
    refundPreference:
      typeof raw.refundPreference === "string" ? raw.refundPreference : defaults.refundPreference,
    notificationPreferences: {
      campaignStatus:
        typeof raw.notificationPreferences?.campaignStatus === "boolean"
          ? raw.notificationPreferences.campaignStatus
          : defaults.notificationPreferences.campaignStatus,
      budgetAlerts:
        typeof raw.notificationPreferences?.budgetAlerts === "boolean"
          ? raw.notificationPreferences.budgetAlerts
          : defaults.notificationPreferences.budgetAlerts,
      paymentAlerts:
        typeof raw.notificationPreferences?.paymentAlerts === "boolean"
          ? raw.notificationPreferences.paymentAlerts
          : defaults.notificationPreferences.paymentAlerts,
      rejectionSpike:
        typeof raw.notificationPreferences?.rejectionSpike === "boolean"
          ? raw.notificationPreferences.rejectionSpike
          : defaults.notificationPreferences.rejectionSpike,
    },
  };
}

export async function updateBusinessSettings(
  userId: string,
  value: BusinessSettings,
) {
  return prisma.systemSetting.upsert({
    where: { key: keyFor(userId) },
    update: { value },
    create: { key: keyFor(userId), value },
  });
}


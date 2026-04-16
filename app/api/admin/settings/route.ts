import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAppSettings, updateAppSettings } from "@/lib/system-settings";
import { prisma } from "@/lib/prisma";
import type {
  CampaignCategoryOption,
  TaxonomySelectOption,
  WorkModeOption,
  WorkTaxonomyCategory,
} from "@/lib/work-taxonomy";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    commissionRateDefault?: number;
    withdrawalFeeRate?: number;
    minWithdrawalAmount?: number;
    fundingFeeRate?: number;
    businessRefundFeeRate?: number;
    levelResetHours?: number;
    maintenanceMode?: boolean;
    bonusAdsEnabled?: boolean;
    adRewardPerView?: number;
    adMaxViewsPerDay?: number;
    adCooldownSeconds?: number;
    adWatchSeconds?: number;
    workTaxonomy?: WorkTaxonomyCategory[];
    campaignCategoryOptions?: CampaignCategoryOption[];
    workModeOptions?: WorkModeOption[];
    workTimeOptions?: TaxonomySelectOption[];
    workingPreferenceOptions?: TaxonomySelectOption[];
    internshipPreferenceOptions?: TaxonomySelectOption[];
    jobEmploymentTypeOptions?: TaxonomySelectOption[];
    jobPayUnitOptions?: TaxonomySelectOption[];
  };

  const before = await getAppSettings();
  const updated = await updateAppSettings(body);

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_UPDATED_SYSTEM_SETTINGS",
      beforeState: before,
      afterState: JSON.parse(JSON.stringify(updated.value)),
    },
  });

  return NextResponse.json({ message: "Settings updated", settings: updated.value });
}

import { NextResponse } from "next/server";
import { getProfileWorkCategoryOptions } from "@/lib/work-taxonomy";
import { getAppSettings } from "@/lib/system-settings";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(
    {
      workTaxonomy: settings.workTaxonomy,
      workModeOptions: settings.workModeOptions,
      profileWorkModes: settings.profileWorkModeOptions,
      jobWorkModes: settings.jobWorkModeOptions,
      workTimeOptions: settings.workTimeOptions,
      workingPreferenceOptions: settings.workingPreferenceOptions,
      internshipPreferenceOptions: settings.internshipPreferenceOptions,
      jobEmploymentTypeOptions: settings.jobEmploymentTypeOptions,
      jobPayUnitOptions: settings.jobPayUnitOptions,
      campaignCategoryOptions: settings.campaignCategoryOptions,
      taskCategories: settings.taskCategories,
      jobCategories: settings.jobCategories,
      profileWorkCategories: getProfileWorkCategoryOptions(settings.workTaxonomy),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

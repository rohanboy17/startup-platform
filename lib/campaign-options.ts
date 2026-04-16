import { CAMPAIGN_CATEGORY_OPTIONS, type CampaignCategoryOption } from "@/lib/work-taxonomy";

export { CAMPAIGN_CATEGORY_OPTIONS };
export type { CampaignCategoryOption };

export const CAMPAIGN_TASK_TYPE_OPTIONS: Record<string, string[]> = {
  marketing: ["Listing QA", "UX Feedback", "App Onboarding Test", "Content Feedback"],
  work: ["Data Entry", "Research Task", "Content Drafting", "Moderation Support"],
};

export function getCampaignCategoryLabel(
  category: string,
  _t?: (key: string) => string,
  options: CampaignCategoryOption[] = CAMPAIGN_CATEGORY_OPTIONS
) {
  const normalized = category.toLowerCase();
  const match = options.find((item) => item.value === normalized);
  if (match) {
    return match.label;
  }
  if (normalized === "one-time") return "Type B - Operations & Delivery Task";
  return category;
}

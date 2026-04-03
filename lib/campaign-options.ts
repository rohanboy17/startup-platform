export const CAMPAIGN_CATEGORY_OPTIONS = [
  {
    value: "marketing",
    label: "Type A - Insight & QA Campaign",
    description: "Listing audits, UX feedback, app onboarding tests, and structured customer insight tasks.",
  },
  {
    value: "work",
    label: "Type B - Operations & Delivery Task",
    description: "Structured micro-work such as data entry, research, moderation, and content delivery.",
  },
] as const;

export const CAMPAIGN_TASK_TYPE_OPTIONS: Record<string, string[]> = {
  marketing: ["Listing QA", "UX Feedback", "App Onboarding Test", "Content Feedback"],
  work: ["Data Entry", "Research Task", "Content Drafting", "Moderation Support"],
};

export function getCampaignCategoryLabel(category: string, t?: (key: string) => string) {
  const normalized = category.toLowerCase();
  const match = CAMPAIGN_CATEGORY_OPTIONS.find((item) => item.value === normalized);
  if (match) {
    if (!t) return match.label;
    // `t` is expected to be scoped to `business.categories`.
    if (normalized === "marketing") return t("marketing");
    if (normalized === "work") return t("work");
    return match.label;
  }
  if (normalized === "one-time") return t ? t("work") : "Type B - Operations & Delivery Task";
  return category;
}

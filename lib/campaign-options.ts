export const CAMPAIGN_CATEGORY_OPTIONS = [
  {
    value: "marketing",
    label: "Type A - Marketing Task",
    description: "Promotional campaigns such as installs, reviews, likes, and traffic.",
  },
  {
    value: "work",
    label: "Type B - Work-Based Task",
    description: "Operational or one-time work such as research, entry, or validation.",
  },
] as const;

export const CAMPAIGN_TASK_TYPE_OPTIONS: Record<string, string[]> = {
  marketing: ["Facebook Like", "Google Review", "Traffic", "App Install"],
  work: ["Data Entry", "Form Fill-Up", "Content Review", "Research Task"],
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
  if (normalized === "one-time") return t ? t("work") : "Type B - Work-Based Task";
  return category;
}

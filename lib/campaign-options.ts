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

export function getCampaignCategoryLabel(category: string) {
  const match = CAMPAIGN_CATEGORY_OPTIONS.find((item) => item.value === category.toLowerCase());
  if (match) return match.label;
  if (category.toLowerCase() === "one-time") return "Type B - Work-Based Task";
  return category;
}

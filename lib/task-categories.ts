export const TASK_CATEGORIES = [
  {
    name: "Digital Marketing",
    items: [
      "Social Media Like",
      "Follow / Subscribe",
      "Share / Retweet",
      "Comment / Engagement",
      "Post Promotion",
      "YouTube Watch / Like",
      "App Install",
      "Website Visit",
      "Ad Click / Traffic",
      "Google Review",
      "Play Store Review",
      "Trustpilot Review",
    ],
  },
  {
    name: "Content & Writing",
    items: [
      "Review Writing",
      "Article Writing",
      "Blog Writing",
      "Product Description",
      "Caption Writing",
      "Copywriting",
      "Translation Work",
      "Proofreading / Editing",
    ],
  },
  {
    name: "Data & Micro Tasks",
    items: [
      "Data Entry",
      "Form Filling",
      "Survey Completion",
      "Captcha Tasks",
      "Image Tagging",
      "Product Listing",
      "Spreadsheet Work",
    ],
  },
  {
    name: "Freelance Work",
    items: [
      "Graphic Design",
      "Logo Design",
      "Video Editing",
      "Photo Editing",
      "Web Design",
      "UI/UX Design",
      "Content Creation",
      "SEO Work",
    ],
  },
  {
    name: "Testing & Feedback",
    items: [
      "App Testing",
      "Website Testing",
      "Bug Reporting",
      "Feature Feedback",
      "Beta Testing",
    ],
  },
  {
    name: "Promotion & Leads",
    items: [
      "Lead Generation",
      "Email Marketing",
      "Affiliate Promotion",
      "Influencer Promotion",
      "Bulk Promotion Campaign",
    ],
  },
  {
    name: "Part-Time Work",
    items: [
      "Bulk Review Campaign",
      "Bulk Data Entry",
      "Bulk Social Tasks",
      "Community Engagement",
      "Telegram / WhatsApp Promotion",
    ],
  },
  {
    name: "Other",
    items: ["Other"],
  },
] as const;

export function getTaskTypesForCategory(taskCategory: string): string[] {
  const category = TASK_CATEGORIES.find((item) => item.name === taskCategory);
  return Array.from(category?.items ?? TASK_CATEGORIES[0].items) as string[];
}

export function isValidTaskCategory(taskCategory: string) {
  return TASK_CATEGORIES.some((item) => item.name === taskCategory);
}

export function isValidTaskType(taskCategory: string, taskType: string) {
  return getTaskTypesForCategory(taskCategory).includes(taskType);
}

export function getEffectiveTaskLabel(taskType: string | null | undefined, customTask?: string | null) {
  if (!taskType) return customTask?.trim() || "Other";
  if (taskType === "Other") {
    return customTask?.trim() || "Other";
  }
  return taskType;
}

export function normalizeTaskSelection(input: {
  taskCategory?: string | null;
  taskType?: string | null;
  customTask?: string | null;
}) {
  const taskCategory = input.taskCategory?.trim() || "";
  const taskType = input.taskType?.trim() || "";
  const customTask = input.customTask?.trim() || null;

  if (!taskCategory) {
    return { error: "Task category is required" as const };
  }

  if (!taskType) {
    return { error: "Task type is required" as const };
  }

  if (!isValidTaskCategory(taskCategory)) {
    return { error: "Invalid task category" as const };
  }

  if (!isValidTaskType(taskCategory, taskType)) {
    return { error: "Invalid task type" as const };
  }

  if (taskType === "Other" && !customTask) {
    return { error: "Custom task is required when task type is Other" as const };
  }

  return {
    taskCategory,
    taskType,
    customTask: taskType === "Other" ? customTask : null,
  };
}

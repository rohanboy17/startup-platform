import {
  getTaskCategoryOptions,
  getWorkTaxonomyCategoryByLabel,
  getWorkTaxonomyCategoryBySlug,
  getWorkTaxonomyTypeByLabel,
  getWorkTaxonomyTypeBySlug,
  type TaskCategoryOption,
  type WorkTaxonomyCategory,
} from "@/lib/work-taxonomy";

export type { TaskCategoryOption };

export const DEFAULT_TASK_CATEGORIES: TaskCategoryOption[] = getTaskCategoryOptions();
export const TASK_CATEGORIES = DEFAULT_TASK_CATEGORIES;

const UNSAFE_TASK_CATEGORY_NAMES = new Set([
  "digital marketing",
  "promotion & leads",
  "part-time work",
]);

const UNSAFE_TASK_TYPE_NAMES = new Set([
  "social media like",
  "follow / subscribe",
  "share / retweet",
  "comment / engagement",
  "post promotion",
  "youtube watch / like",
  "app install",
  "website visit",
  "ad click / traffic",
  "google review",
  "play store review",
  "trustpilot review",
  "tripadvisor review",
  "email marketing",
  "affiliate promotion",
  "influencer promotion",
  "bulk promotion campaign",
  "bulk review campaign",
  "bulk social tasks",
  "telegram / whatsapp promotion",
]);

function isUnsafeTaskCatalogLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return UNSAFE_TASK_CATEGORY_NAMES.has(normalized) || UNSAFE_TASK_TYPE_NAMES.has(normalized);
}

export function normalizeTaskCategoryConfig(input: unknown): TaskCategoryOption[] {
  if (!Array.isArray(input)) return DEFAULT_TASK_CATEGORIES;

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const normalized = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { name?: unknown; items?: unknown };
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const items = Array.isArray(record.items)
        ? record.items
            .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
            .filter(Boolean)
        : [];
      if (!name || items.length === 0) return null;
      return {
        name,
        slug: toSlug(name),
        items,
        types: items.map((label) => ({ slug: toSlug(label), label })),
      };
    })
    .filter((item): item is TaskCategoryOption => Boolean(item));

  if (normalized.length === 0) return DEFAULT_TASK_CATEGORIES;
  if (!normalized.some((item) => item.name === "Other")) {
    normalized.push({
      name: "Other",
      slug: "other",
      items: ["Other"],
      types: [{ slug: "other", label: "Other" }],
    });
  }
  return normalized;
}

export function getLaunchSafeTaskCategories(input: unknown): TaskCategoryOption[] {
  const normalized = normalizeTaskCategoryConfig(input);

  const hasUnsafeContent = normalized.some(
    (category) =>
      isUnsafeTaskCatalogLabel(category.name) || category.items.some((item) => isUnsafeTaskCatalogLabel(item))
  );

  if (hasUnsafeContent) {
    return DEFAULT_TASK_CATEGORIES;
  }

  return normalized;
}

export function getTaskTypesForCategory(
  taskCategory: string,
  categories: TaskCategoryOption[] = DEFAULT_TASK_CATEGORIES
): string[] {
  const category = categories.find((item) => item.name === taskCategory);
  return Array.from(category?.items ?? categories[0]?.items ?? ["Other"]);
}

export function isValidTaskCategory(
  taskCategory: string,
  categories: TaskCategoryOption[] = DEFAULT_TASK_CATEGORIES
) {
  return categories.some((item) => item.name === taskCategory);
}

export function isValidTaskType(
  taskCategory: string,
  taskType: string,
  categories: TaskCategoryOption[] = DEFAULT_TASK_CATEGORIES
) {
  return getTaskTypesForCategory(taskCategory, categories).includes(taskType);
}

export function getEffectiveTaskLabel(taskType: string | null | undefined, customTask?: string | null) {
  if (!taskType) return customTask?.trim() || "Other";
  if (taskType === "Other") {
    return customTask?.trim() || "Other";
  }
  return taskType;
}

export function getTaskCategoryLabel(
  taskCategorySlug: string | null | undefined,
  fallback: string | null | undefined,
  taxonomy?: WorkTaxonomyCategory[]
) {
  return (
    getWorkTaxonomyCategoryBySlug(taskCategorySlug, taxonomy)?.label ??
    fallback ??
    "Other"
  );
}

export function getTaskTypeLabel(
  taskCategorySlug: string | null | undefined,
  taskTypeSlug: string | null | undefined,
  fallback: string | null | undefined,
  customTask?: string | null,
  taxonomy?: WorkTaxonomyCategory[]
) {
  if (taskTypeSlug === "other") {
    return customTask?.trim() || fallback || "Other";
  }
  return (
    getWorkTaxonomyTypeBySlug(taskCategorySlug, taskTypeSlug, "campaign", taxonomy)?.label ??
    fallback ??
    customTask?.trim() ??
    "Other"
  );
}

export function normalizeTaskSelection(
  input: {
    taskCategory?: string | null;
    taskType?: string | null;
    customTask?: string | null;
  },
  categories: TaskCategoryOption[] = DEFAULT_TASK_CATEGORIES,
  taxonomy?: WorkTaxonomyCategory[]
) {
  const taskCategory = input.taskCategory?.trim() || "";
  const taskType = input.taskType?.trim() || "";
  const customTask = input.customTask?.trim() || null;

  if (!taskCategory) {
    return { error: "Task category is required" as const };
  }

  if (!taskType) {
    return { error: "Task type is required" as const };
  }

  if (!isValidTaskCategory(taskCategory, categories)) {
    return { error: "Invalid task category" as const };
  }

  if (!isValidTaskType(taskCategory, taskType, categories)) {
    return { error: "Invalid task type" as const };
  }

  if (taskType === "Other" && !customTask) {
    return { error: "Custom task is required when task type is Other" as const };
  }

  const categorySlug =
    categories.find((item) => item.name === taskCategory)?.slug ??
    getWorkTaxonomyCategoryByLabel(taskCategory, taxonomy)?.slug ??
    null;
  const typeSlug =
    (categorySlug
      ? getWorkTaxonomyTypeByLabel(categorySlug, taskType, "campaign", taxonomy)?.slug
      : null) ??
    null;

  return {
    taskCategory,
    taskCategorySlug: categorySlug,
    taskType,
    taskTypeSlug: typeSlug,
    customTask: taskType === "Other" ? customTask : null,
  };
}

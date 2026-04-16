import {
  getJobCategoryOptions,
  getWorkTaxonomyCategoryByLabel,
  getWorkTaxonomyCategoryBySlug,
  getWorkTaxonomyTypeByLabel,
  getWorkTaxonomyTypeBySlug,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  JOB_WORK_MODE_OPTIONS,
  type JobCategoryOption,
  type WorkTaxonomyCategory,
} from "@/lib/work-taxonomy";

export type { JobCategoryOption };

export const DEFAULT_JOB_CATEGORIES: JobCategoryOption[] = getJobCategoryOptions();

export function getJobTypesForCategory(
  jobCategory: string,
  categories: JobCategoryOption[] = DEFAULT_JOB_CATEGORIES
) {
  const category = categories.find((item) => item.name === jobCategory);
  return Array.from(category?.items ?? categories[0]?.items ?? ["Other"]);
}

export function isValidJobCategory(
  jobCategory: string,
  categories: JobCategoryOption[] = DEFAULT_JOB_CATEGORIES
) {
  return categories.some((item) => item.name === jobCategory);
}

export function isValidJobType(
  jobCategory: string,
  jobType: string,
  categories: JobCategoryOption[] = DEFAULT_JOB_CATEGORIES
) {
  return getJobTypesForCategory(jobCategory, categories).includes(jobType);
}

export function getEffectiveJobTypeLabel(jobType: string | null | undefined, customJobType?: string | null) {
  if (!jobType) return customJobType?.trim() || "Other";
  if (jobType === "Other") return customJobType?.trim() || "Other";
  return jobType;
}

export function getJobCategorySlug(jobCategory: string | null | undefined) {
  return getWorkTaxonomyCategoryByLabel(jobCategory)?.slug ?? null;
}

export function getJobCategoryLabel(
  jobCategorySlug: string | null | undefined,
  fallback: string | null | undefined,
  taxonomy?: WorkTaxonomyCategory[]
) {
  return (
    getWorkTaxonomyCategoryBySlug(jobCategorySlug, taxonomy)?.label ??
    fallback ??
    "Other"
  );
}

export function getJobTypeLabel(
  jobCategorySlug: string | null | undefined,
  jobTypeSlug: string | null | undefined,
  fallback: string | null | undefined,
  customJobType?: string | null,
  taxonomy?: WorkTaxonomyCategory[]
) {
  if (jobTypeSlug === "other") {
    return customJobType?.trim() || fallback || "Other";
  }
  return (
    getWorkTaxonomyTypeBySlug(jobCategorySlug, jobTypeSlug, "job", taxonomy)?.label ??
    fallback ??
    customJobType?.trim() ??
    "Other"
  );
}

export function normalizeJobSelection(
  input: {
    jobCategory?: string | null;
    jobType?: string | null;
    customJobType?: string | null;
  },
  categories: JobCategoryOption[] = DEFAULT_JOB_CATEGORIES,
  taxonomy?: WorkTaxonomyCategory[]
) {
  const jobCategory = input.jobCategory?.trim() || "";
  const jobType = input.jobType?.trim() || "";
  const customJobType = input.customJobType?.trim() || null;

  if (!jobCategory) return { error: "Job category is required" as const };
  if (!jobType) return { error: "Job type is required" as const };
  if (!isValidJobCategory(jobCategory, categories)) return { error: "Invalid job category" as const };
  if (!isValidJobType(jobCategory, jobType, categories)) return { error: "Invalid job type" as const };
  if (jobType === "Other" && !customJobType) {
    return { error: "Custom job type is required when job type is Other" as const };
  }

  const categorySlug =
    categories.find((item) => item.name === jobCategory)?.slug ??
    getWorkTaxonomyCategoryByLabel(jobCategory, taxonomy)?.slug ??
    null;
  const typeSlug =
    (categorySlug
      ? getWorkTaxonomyTypeByLabel(categorySlug, jobType, "job", taxonomy)?.slug
      : null) ??
    null;

  return {
    jobCategory,
    jobCategorySlug: categorySlug,
    jobType,
    jobTypeSlug: typeSlug,
    customJobType: jobType === "Other" ? customJobType : null,
  };
}

export {
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  JOB_WORK_MODE_OPTIONS,
};

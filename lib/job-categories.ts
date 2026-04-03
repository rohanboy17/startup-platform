export type JobCategoryOption = {
  name: string;
  items: string[];
};

export const DEFAULT_JOB_CATEGORIES: JobCategoryOption[] = [
  {
    name: "Field Operations & Audits",
    items: [
      "Store Visit Audit",
      "Retail Shelf Check",
      "Field Survey Visit",
      "Mystery Audit Support",
      "Local Verification Visit",
    ],
  },
  {
    name: "Office & Admin Support",
    items: [
      "Office Assistant",
      "Back Office Support",
      "Document Handling",
      "Reception Support",
      "Inventory Desk Support",
    ],
  },
  {
    name: "Delivery & Logistics Support",
    items: [
      "Local Delivery Support",
      "Pickup Coordination",
      "Warehouse Sorting",
      "Dispatch Support",
      "Route Assistance",
    ],
  },
  {
    name: "Event & Promotion Support",
    items: [
      "Event Crew Support",
      "Brand Promoter",
      "Sampling Support",
      "Registration Desk Support",
      "Venue Assistance",
    ],
  },
  {
    name: "Sales & Customer Support",
    items: [
      "In-Store Sales Support",
      "Lead Collection Support",
      "Field Sales Support",
      "Customer Help Desk",
      "Telecalling Support",
    ],
  },
  {
    name: "Skilled Services",
    items: [
      "Technician Visit",
      "Installation Support",
      "Maintenance Visit",
      "Device Setup Support",
      "Photography Visit",
    ],
  },
  {
    name: "Other",
    items: ["Other"],
  },
];

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

export function normalizeJobSelection(input: {
  jobCategory?: string | null;
  jobType?: string | null;
  customJobType?: string | null;
}, categories: JobCategoryOption[] = DEFAULT_JOB_CATEGORIES) {
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

  return {
    jobCategory,
    jobType,
    customJobType: jobType === "Other" ? customJobType : null,
  };
}

export const JOB_WORK_MODE_OPTIONS = [
  { value: "WORK_FROM_OFFICE", label: "Office" },
  { value: "WORK_IN_FIELD", label: "Field" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const JOB_EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DAILY_GIG", label: "Daily gig" },
] as const;

export const JOB_PAY_UNIT_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "FIXED", label: "Fixed" },
] as const;

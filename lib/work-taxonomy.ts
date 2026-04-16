export type WorkSurface = "profile" | "job" | "campaign";

export type WorkTaxonomyType = {
  slug: string;
  label: string;
};

export type WorkTaxonomyCategory = {
  slug: string;
  label: string;
  description: string;
  surfaces: WorkSurface[];
  jobTypes: WorkTaxonomyType[];
  taskTypes: WorkTaxonomyType[];
};

export type CampaignCategoryOption = {
  value: string;
  label: string;
  description: string;
};

export type TaxonomySelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type WorkModeOption = TaxonomySelectOption & {
  surfaces: WorkSurface[];
};

export type JobCategoryOption = {
  name: string;
  slug: string;
  items: string[];
  types: WorkTaxonomyType[];
};

export type TaskCategoryOption = {
  name: string;
  slug: string;
  items: string[];
  types: WorkTaxonomyType[];
};

function typeList(labels: string[]): WorkTaxonomyType[] {
  return labels.map((label) => ({
    slug: normalizeSlug(label),
    label,
  }));
}

const DEFAULT_WORK_TAXONOMY_CATEGORIES: WorkTaxonomyCategory[] = [
  {
    slug: "listing-insight-experience-qa",
    label: "Listing, Insight & Experience QA",
    description: "Customer insight, listing checks, onboarding tests, and structured feedback work.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Google Business Profile QA",
      "Local Listing Accuracy Audit",
      "Website Journey Test",
      "Landing Page UX Test",
      "App Listing QA",
      "App Onboarding Test",
      "Video Watchability Feedback",
      "Content Appeal Feedback",
      "Campaign Message Clarity Test",
      "Screenshot-Based Listing Audit",
    ]),
  },
  {
    slug: "content-writing",
    label: "Content & Writing",
    description: "Writing, editing, translations, and content delivery work.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Article Writing",
      "Blog Writing",
      "Product Description",
      "Caption Writing",
      "Copywriting",
      "Translation Work",
      "Proofreading / Editing",
      "Help Center Writing",
    ]),
  },
  {
    slug: "data-research-operations",
    label: "Data, Research & Operations",
    description: "Data tasks, research support, spreadsheets, and structured operations work.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Data Entry",
      "Form Filling",
      "Survey Completion",
      "Image Tagging",
      "Product Listing",
      "Spreadsheet Work",
      "Lead List Verification",
      "Manual Research Task",
    ]),
  },
  {
    slug: "design-creative-delivery",
    label: "Design & Creative Delivery",
    description: "Creative production, visual assets, and design delivery work.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Graphic Design",
      "Logo Design",
      "Video Editing",
      "Photo Editing",
      "Web Design",
      "UI/UX Design",
      "Creative Asset Refresh",
      "Content Creation",
    ]),
  },
  {
    slug: "testing-feedback",
    label: "Testing & Feedback",
    description: "Product testing, usability checks, bug feedback, and review-ready insights.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "App Testing",
      "Website Testing",
      "Bug Reporting",
      "Feature Feedback",
      "Beta Testing",
      "Usability Feedback",
    ]),
  },
  {
    slug: "support-moderation-community",
    label: "Support, Moderation & Community",
    description: "Support drafts, moderation, tagging, and inbox or community support.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Comment Moderation Support",
      "Community Moderation",
      "Support Reply Drafting",
      "Sentiment Tagging",
      "FAQ Tagging",
      "Inbox Triage",
    ]),
  },
  {
    slug: "research-growth-ops",
    label: "Research & Growth Ops",
    description: "Research snapshots, enrichment, SEO support, and growth operations work.",
    surfaces: ["profile", "campaign"],
    jobTypes: [],
    taskTypes: typeList([
      "Competitor Research Snapshot",
      "Lead Qualification",
      "Listing Data Enrichment",
      "SEO Metadata Review",
      "Catalog Cleanup",
    ]),
  },
  {
    slug: "field-operations-audits",
    label: "Field Operations & Audits",
    description: "Store visits, local checks, mystery audits, and field verification work.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "Store Visit Audit",
      "Retail Shelf Check",
      "Field Survey Visit",
      "Mystery Audit Support",
      "Local Verification Visit",
    ]),
    taskTypes: [],
  },
  {
    slug: "office-admin-support",
    label: "Office & Admin Support",
    description: "Office assistance, documentation, desk support, and admin operations.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "Office Assistant",
      "Back Office Support",
      "Document Handling",
      "Reception Support",
      "Inventory Desk Support",
    ]),
    taskTypes: [],
  },
  {
    slug: "delivery-logistics-support",
    label: "Delivery & Logistics Support",
    description: "Pickup, dispatch, warehouse support, and local logistics work.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "Local Delivery Support",
      "Pickup Coordination",
      "Warehouse Sorting",
      "Dispatch Support",
      "Route Assistance",
    ]),
    taskTypes: [],
  },
  {
    slug: "event-promotion-support",
    label: "Event & Promotion Support",
    description: "Event crews, registration desks, sampling, and venue support work.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "Event Crew Support",
      "Brand Promoter",
      "Sampling Support",
      "Registration Desk Support",
      "Venue Assistance",
    ]),
    taskTypes: [],
  },
  {
    slug: "sales-customer-support",
    label: "Sales & Customer Support",
    description: "Sales assistance, lead collection, telecalling, and customer-facing support.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "In-Store Sales Support",
      "Lead Collection Support",
      "Field Sales Support",
      "Customer Help Desk",
      "Telecalling Support",
    ]),
    taskTypes: [],
  },
  {
    slug: "skilled-services",
    label: "Skilled Services",
    description: "Technical visits, installations, maintenance, and specialist support.",
    surfaces: ["profile", "job"],
    jobTypes: typeList([
      "Technician Visit",
      "Installation Support",
      "Maintenance Visit",
      "Device Setup Support",
      "Photography Visit",
    ]),
    taskTypes: [],
  },
  {
    slug: "other",
    label: "Other",
    description: "Custom work areas that do not fit the standard catalog yet.",
    surfaces: ["profile", "job", "campaign"],
    jobTypes: typeList(["Other"]),
    taskTypes: typeList(["Other"]),
  },
];

const DEFAULT_CAMPAIGN_CATEGORY_OPTIONS: CampaignCategoryOption[] = [
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
];

const VALID_SURFACES: WorkSurface[] = ["profile", "job", "campaign"];

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

function normalizeText(input: unknown, max = 160) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

function normalizeSlug(input: unknown) {
  const value = normalizeText(input, 80)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return value.slice(0, 60);
}

function normalizeTypeList(input: unknown, maxItems = 24, maxLength = 120) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const values: WorkTaxonomyType[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const label = normalizeText(item, maxLength);
      const slug = normalizeSlug(label);
      if (!label || !slug || seen.has(slug)) continue;
      seen.add(slug);
      values.push({ slug, label });
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      const label = normalizeText(record.label, maxLength);
      const slug = normalizeSlug(record.slug || label);
      if (!label || !slug || seen.has(slug)) continue;
      seen.add(slug);
      values.push({ slug, label });
    }
    if (values.length >= maxItems) break;
  }
  return values;
}

function normalizeSurfaceArray(input: unknown) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<WorkSurface>();
  const values: WorkSurface[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase() as WorkSurface;
    if (!VALID_SURFACES.includes(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(normalized);
  }
  return values;
}

function isUnsafeTaskCatalogLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return UNSAFE_TASK_CATEGORY_NAMES.has(normalized) || UNSAFE_TASK_TYPE_NAMES.has(normalized);
}

export function normalizeWorkTaxonomyConfig(input: unknown): WorkTaxonomyCategory[] {
  if (!Array.isArray(input)) return DEFAULT_WORK_TAXONOMY_CATEGORIES;

  const seenSlugs = new Set<string>();
  const normalized = input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const label = normalizeText(record.label, 120);
      const slug = normalizeSlug(record.slug || label);
      const description = normalizeText(record.description, 240);
      const surfaces = normalizeSurfaceArray(record.surfaces);
      const jobTypes = normalizeTypeList(record.jobTypes, 24, 120);
      const taskTypes = normalizeTypeList(record.taskTypes, 24, 120);
      if (!label || !slug || !description || surfaces.length === 0) return null;
      if (seenSlugs.has(slug)) return null;
      if (!jobTypes.length && !taskTypes.length) return null;
      seenSlugs.add(slug);
      return { slug, label, description, surfaces, jobTypes, taskTypes } satisfies WorkTaxonomyCategory;
    })
    .filter((item): item is WorkTaxonomyCategory => Boolean(item));

  if (normalized.length === 0) return DEFAULT_WORK_TAXONOMY_CATEGORIES;
  if (!normalized.some((item) => item.slug === "other")) {
    normalized.push({
      slug: "other",
      label: "Other",
      description: "Custom work areas that do not fit the standard catalog yet.",
      surfaces: ["profile", "job", "campaign"],
      jobTypes: typeList(["Other"]),
      taskTypes: typeList(["Other"]),
    });
  }
  return normalized;
}

export function getLaunchSafeWorkTaxonomy(input: unknown): WorkTaxonomyCategory[] {
  const normalized = normalizeWorkTaxonomyConfig(input);
  const hasUnsafeTaskContent = normalized.some(
    (category) =>
      isUnsafeTaskCatalogLabel(category.label) ||
      category.taskTypes.some((item) => isUnsafeTaskCatalogLabel(item.label))
  );
  return hasUnsafeTaskContent ? DEFAULT_WORK_TAXONOMY_CATEGORIES : normalized;
}

export function normalizeCampaignCategoryOptions(input: unknown): CampaignCategoryOption[] {
  if (!Array.isArray(input)) return DEFAULT_CAMPAIGN_CATEGORY_OPTIONS;
  const seen = new Set<string>();
  const normalized = input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const value = normalizeSlug(record.value || record.label);
      const label = normalizeText(record.label, 120);
      const description = normalizeText(record.description, 240);
      if (!value || !label || !description || seen.has(value)) return null;
      seen.add(value);
      return { value, label, description } satisfies CampaignCategoryOption;
    })
    .filter((item): item is CampaignCategoryOption => Boolean(item));

  return normalized.length > 0 ? normalized : DEFAULT_CAMPAIGN_CATEGORY_OPTIONS;
}

export const WORK_TAXONOMY_CATEGORIES = DEFAULT_WORK_TAXONOMY_CATEGORIES;
export const CAMPAIGN_CATEGORY_OPTIONS = DEFAULT_CAMPAIGN_CATEGORY_OPTIONS;

const DEFAULT_WORK_MODE_OPTIONS: WorkModeOption[] = [
  { value: "WORK_FROM_HOME", label: "Work from home", surfaces: ["profile"] },
  { value: "WORK_FROM_OFFICE", label: "Office", surfaces: ["profile", "job"] },
  { value: "WORK_IN_FIELD", label: "Field", surfaces: ["profile", "job"] },
  { value: "HYBRID", label: "Hybrid", surfaces: ["job"] },
];

const DEFAULT_WORK_TIME_OPTIONS: TaxonomySelectOption[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
];

const DEFAULT_WORKING_PREFERENCE_OPTIONS: TaxonomySelectOption[] = [
  { value: "SALARIED", label: "Salaried" },
  { value: "FREELANCE_CONTRACTUAL", label: "Freelance / contractual" },
  { value: "DAY_BASIS", label: "Day basis" },
];

const DEFAULT_INTERNSHIP_PREFERENCE_OPTIONS: TaxonomySelectOption[] = [
  { value: "OPEN_TO_INTERNSHIP", label: "Open to internships" },
  { value: "INTERNSHIP_ONLY", label: "Internships only" },
  { value: "NOT_INTERESTED", label: "Not interested" },
];

const DEFAULT_JOB_EMPLOYMENT_TYPE_OPTIONS: TaxonomySelectOption[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DAILY_GIG", label: "Daily gig" },
  { value: "INTERNSHIP", label: "Internship" },
];

const DEFAULT_JOB_PAY_UNIT_OPTIONS: TaxonomySelectOption[] = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "FIXED", label: "Fixed" },
];

function normalizeOptionValue(input: unknown) {
  return normalizeText(input, 48)
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function normalizeTaxonomySelectOptions(
  input: unknown,
  fallback: readonly TaxonomySelectOption[]
): TaxonomySelectOption[] {
  if (!Array.isArray(input)) return [...fallback];

  const allowed = new Map(fallback.map((item) => [item.value, item]));
  const seen = new Set<string>();
  const normalized: TaxonomySelectOption[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const value = normalizeOptionValue(record.value);
    const fallbackOption = allowed.get(value);
    if (!fallbackOption || seen.has(value)) continue;
    seen.add(value);
    const label = normalizeText(record.label, 120) || fallbackOption.label;
    normalized.push(
      fallbackOption.description
        ? { value, label, description: fallbackOption.description }
        : { value, label }
    );
  }

  return normalized.length > 0 ? normalized : [...fallback];
}

export function normalizeWorkModeOptions(input: unknown): WorkModeOption[] {
  if (!Array.isArray(input)) return DEFAULT_WORK_MODE_OPTIONS;

  const defaultsByValue = new Map(
    DEFAULT_WORK_MODE_OPTIONS.map((item) => [item.value, item])
  );
  const normalized = input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const value = normalizeOptionValue(record.value);
      const fallbackOption = defaultsByValue.get(value);
      if (!fallbackOption) return null;
      const label = normalizeText(record.label, 120) || fallbackOption.label;
      const surfaces = normalizeSurfaceArray(record.surfaces).filter((surface) =>
        fallbackOption.surfaces.includes(surface)
      );
      return {
        value,
        label,
        surfaces: surfaces.length > 0 ? surfaces : fallbackOption.surfaces,
      } satisfies WorkModeOption;
    })
    .filter((item): item is WorkModeOption => Boolean(item));

  if (
    normalized.length === 0 ||
    !normalized.some((item) => item.surfaces.includes("profile")) ||
    !normalized.some((item) => item.surfaces.includes("job"))
  ) {
    return DEFAULT_WORK_MODE_OPTIONS;
  }

  return normalized;
}

export const WORK_MODE_OPTIONS = DEFAULT_WORK_MODE_OPTIONS;
export const WORK_TIME_OPTIONS = DEFAULT_WORK_TIME_OPTIONS;
export const WORKING_PREFERENCE_OPTIONS = DEFAULT_WORKING_PREFERENCE_OPTIONS;
export const INTERNSHIP_PREFERENCE_OPTIONS = DEFAULT_INTERNSHIP_PREFERENCE_OPTIONS;
export const JOB_EMPLOYMENT_TYPE_OPTIONS = DEFAULT_JOB_EMPLOYMENT_TYPE_OPTIONS;
export const JOB_PAY_UNIT_OPTIONS = DEFAULT_JOB_PAY_UNIT_OPTIONS;

export function getProfileWorkModeOptions(options: WorkModeOption[] = WORK_MODE_OPTIONS) {
  return options
    .filter((option) => option.surfaces.includes("profile"))
    .map((option) => ({ value: option.value, label: option.label }));
}

export function getJobWorkModeOptions(options: WorkModeOption[] = WORK_MODE_OPTIONS) {
  return options
    .filter((option) => option.surfaces.includes("job"))
    .map((option) => ({ value: option.value, label: option.label }));
}

export const PROFILE_WORK_MODE_OPTIONS = getProfileWorkModeOptions();
export const JOB_WORK_MODE_OPTIONS = getJobWorkModeOptions();

export function getJobCategoryOptions(taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES): JobCategoryOption[] {
  return taxonomy.filter((category) => category.jobTypes.length > 0).map((category) => ({
    name: category.label,
    slug: category.slug,
    items: category.jobTypes.map((item) => item.label),
    types: [...category.jobTypes],
  }));
}

export function getTaskCategoryOptions(taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES): TaskCategoryOption[] {
  return taxonomy.filter((category) => category.taskTypes.length > 0).map((category) => ({
    name: category.label,
    slug: category.slug,
    items: category.taskTypes.map((item) => item.label),
    types: [...category.taskTypes],
  }));
}

export function getProfileWorkCategoryOptions(taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES) {
  return taxonomy.filter((category) => category.surfaces.includes("profile")).map((category) => ({
    value: category.slug,
    label: category.label,
    description: category.description,
  }));
}

export const PROFILE_WORK_CATEGORY_OPTIONS = getProfileWorkCategoryOptions();

export function getWorkTaxonomyCategoryByLabel(
  label: string | null | undefined,
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  return taxonomy.find((category) => category.label.toLowerCase() === normalized) || null;
}

export function getWorkTaxonomyTypeByLabel(
  categorySlug: string | null | undefined,
  label: string | null | undefined,
  surface: "job" | "campaign",
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  if (!categorySlug || !label) return null;
  const category = getWorkTaxonomyCategoryBySlug(categorySlug, taxonomy);
  if (!category) return null;
  const normalized = label.trim().toLowerCase();
  const items = surface === "job" ? category.jobTypes : category.taskTypes;
  return items.find((item) => item.label.toLowerCase() === normalized) || null;
}

export function getWorkTaxonomyTypeBySlug(
  categorySlug: string | null | undefined,
  typeSlug: string | null | undefined,
  surface: "job" | "campaign",
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  if (!categorySlug || !typeSlug) return null;
  const category = getWorkTaxonomyCategoryBySlug(categorySlug, taxonomy);
  if (!category) return null;
  const items = surface === "job" ? category.jobTypes : category.taskTypes;
  return items.find((item) => item.slug === typeSlug) || null;
}

export function getWorkTaxonomyCategoryBySlug(
  slug: string | null | undefined,
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  return taxonomy.find((category) => category.slug === normalized) || null;
}

export function getWorkTaxonomyLabelBySlug(
  slug: string | null | undefined,
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  return getWorkTaxonomyCategoryBySlug(slug, taxonomy)?.label ?? null;
}

export function getTaxonomyOptionLabel(
  value: string | null | undefined,
  options: readonly TaxonomySelectOption[],
  fallback?: string | null
) {
  if (!value) return fallback ?? null;
  return options.find((option) => option.value === value)?.label ?? fallback ?? value;
}

export function getAllowedProfileWorkCategorySlugs(taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES) {
  return new Set(getProfileWorkCategoryOptions(taxonomy).map((option) => option.value));
}

export function normalizeProfileWorkCategorySlugs(
  input: unknown,
  maxItems = 8,
  taxonomy: WorkTaxonomyCategory[] = WORK_TAXONOMY_CATEGORIES
) {
  if (!Array.isArray(input)) return [];
  const allowed = getAllowedProfileWorkCategorySlugs(taxonomy);
  const seen = new Set<string>();
  const values: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || !allowed.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(normalized);
    if (values.length >= maxItems) break;
  }

  return values;
}

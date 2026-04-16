ALTER TABLE "Campaign"
ADD COLUMN "categorySlug" TEXT,
ADD COLUMN "taskCategorySlug" TEXT,
ADD COLUMN "taskTypeSlug" TEXT;

ALTER TABLE "JobPosting"
ADD COLUMN "jobCategorySlug" TEXT,
ADD COLUMN "jobTypeSlug" TEXT;

UPDATE "Campaign"
SET
  "categorySlug" = COALESCE(NULLIF(LOWER(TRIM("category")), ''), 'marketing'),
  "taskCategorySlug" = COALESCE(
    NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(COALESCE("taskCategory", 'other'))), '[^a-z0-9\s-]', '', 'g'),
        '\s+',
        '-',
        'g'
      ),
      ''
    ),
    'other'
  ),
  "taskTypeSlug" = COALESCE(
    NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(COALESCE("taskType", 'other'))), '[^a-z0-9\s-]', '', 'g'),
        '\s+',
        '-',
        'g'
      ),
      ''
    ),
    'other'
  )
WHERE "categorySlug" IS NULL
   OR "taskCategorySlug" IS NULL
   OR "taskTypeSlug" IS NULL;

UPDATE "JobPosting"
SET
  "jobCategorySlug" = COALESCE(
    NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(COALESCE("jobCategory", 'other'))), '[^a-z0-9\s-]', '', 'g'),
        '\s+',
        '-',
        'g'
      ),
      ''
    ),
    'other'
  ),
  "jobTypeSlug" = COALESCE(
    NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(COALESCE("jobType", 'other'))), '[^a-z0-9\s-]', '', 'g'),
        '\s+',
        '-',
        'g'
      ),
      ''
    ),
    'other'
  )
WHERE "jobCategorySlug" IS NULL
   OR "jobTypeSlug" IS NULL;

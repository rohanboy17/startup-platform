-- AlterEnum
ALTER TYPE "JobEmploymentType" ADD VALUE 'INTERNSHIP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobPostingStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "JobPostingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "adminReason" TEXT,
ADD COLUMN     "adminReviewedAt" TIMESTAMP(3),
ADD COLUMN     "adminReviewedByUserId" TEXT,
ADD COLUMN     "adminStatus" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "managerReason" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "managerReviewedByUserId" TEXT,
ADD COLUMN     "managerStatus" "SubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "budgetRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedByUserId" TEXT,
ADD COLUMN     "reviewNote" TEXT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobApplicationStatus" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "JobApplicationStatus" ADD VALUE 'JOINED';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "interviewAt" TIMESTAMP(3),
ADD COLUMN     "joinedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "hiringRadiusKm" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

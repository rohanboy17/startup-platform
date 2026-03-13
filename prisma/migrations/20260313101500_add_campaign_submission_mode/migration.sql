-- CreateEnum
CREATE TYPE "CampaignSubmissionMode" AS ENUM ('ONE_PER_USER', 'MULTIPLE_PER_USER');

-- AlterTable
ALTER TABLE "Campaign"
ADD COLUMN "submissionMode" "CampaignSubmissionMode" NOT NULL DEFAULT 'MULTIPLE_PER_USER';

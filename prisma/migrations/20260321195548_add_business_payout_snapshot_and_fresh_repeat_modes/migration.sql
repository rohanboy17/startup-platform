-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CampaignRepeatAccessMode" ADD VALUE 'FRESH_CAMPAIGN_ONLY';
ALTER TYPE "CampaignRepeatAccessMode" ADD VALUE 'FRESH_PLATFORM_ONLY';

-- AlterTable
ALTER TABLE "BusinessFunding" ADD COLUMN     "payoutUpiId" TEXT,
ADD COLUMN     "payoutUpiName" TEXT;

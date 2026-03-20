-- CreateEnum
CREATE TYPE "CampaignRepeatAccessMode" AS ENUM ('OPEN', 'REQUESTED_ONLY', 'REQUESTED_PLUS_NEW');

-- CreateEnum
CREATE TYPE "CampaignRepeatRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "repeatAccessMode" "CampaignRepeatAccessMode" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "CampaignRepeatRequest" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CampaignRepeatRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "CampaignRepeatRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignRepeatRequest_campaignId_status_createdAt_idx" ON "CampaignRepeatRequest"("campaignId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignRepeatRequest_userId_status_createdAt_idx" ON "CampaignRepeatRequest"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRepeatRequest_campaignId_userId_requestDateKey_key" ON "CampaignRepeatRequest"("campaignId", "userId", "requestDateKey");

-- AddForeignKey
ALTER TABLE "CampaignRepeatRequest" ADD CONSTRAINT "CampaignRepeatRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRepeatRequest" ADD CONSTRAINT "CampaignRepeatRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

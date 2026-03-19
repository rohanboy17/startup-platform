CREATE TYPE "BusinessFundingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "BusinessFunding" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceId" TEXT NOT NULL,
    "utr" TEXT,
    "proofImage" TEXT NOT NULL,
    "status" "BusinessFundingStatus" NOT NULL DEFAULT 'PENDING',
    "flaggedReason" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessFunding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessFunding_referenceId_key" ON "BusinessFunding"("referenceId");
CREATE INDEX "BusinessFunding_businessId_status_createdAt_idx" ON "BusinessFunding"("businessId", "status", "createdAt");
CREATE INDEX "BusinessFunding_status_createdAt_idx" ON "BusinessFunding"("status", "createdAt");

ALTER TABLE "BusinessFunding"
ADD CONSTRAINT "BusinessFunding_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessFunding"
ADD CONSTRAINT "BusinessFunding_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "BusinessFunding_businessId_status_createdAt_idx";

-- DropIndex
DROP INDEX "BusinessFunding_status_createdAt_idx";

-- CreateTable
CREATE TABLE "BusinessRefundRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "requestNote" TEXT,
    "status" "BusinessFundingStatus" NOT NULL DEFAULT 'PENDING',
    "flaggedReason" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRefundRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BusinessRefundRequest" ADD CONSTRAINT "BusinessRefundRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRefundRequest" ADD CONSTRAINT "BusinessRefundRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BusinessKycRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT,
    "taxId" TEXT,
    "documentUrl" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,

    CONSTRAINT "BusinessKycRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BusinessKycRequest" ADD CONSTRAINT "BusinessKycRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

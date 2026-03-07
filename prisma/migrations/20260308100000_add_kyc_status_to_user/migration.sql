-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "kycNotes" TEXT,
ADD COLUMN "kycVerifiedAt" TIMESTAMP(3);


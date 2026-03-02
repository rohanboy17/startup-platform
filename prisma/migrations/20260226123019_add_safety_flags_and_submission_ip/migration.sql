-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "ipAddress" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspiciousReason" TEXT;

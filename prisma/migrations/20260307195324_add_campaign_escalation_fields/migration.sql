-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalationReason" TEXT;

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "statusUpdatedAt" TIMESTAMP(3);


-- CreateEnum
CREATE TYPE "ManagerQueueSort" AS ENUM ('NEWEST', 'OLDEST');

-- CreateEnum
CREATE TYPE "ManagerProofMode" AS ENUM ('COMPACT', 'EXPANDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultUpiId" TEXT,
ADD COLUMN     "defaultUpiName" TEXT,
ADD COLUMN     "managerAutoNext" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerProofMode" "ManagerProofMode" NOT NULL DEFAULT 'COMPACT',
ADD COLUMN     "managerQueueSort" "ManagerQueueSort" NOT NULL DEFAULT 'NEWEST',
ADD COLUMN     "managerRiskOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Calcutta';

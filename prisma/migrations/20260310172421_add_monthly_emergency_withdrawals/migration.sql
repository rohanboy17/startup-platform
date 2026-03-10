-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emergencyWithdrawMonthKey" TEXT,
ADD COLUMN     "monthlyEmergencyWithdrawCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false;

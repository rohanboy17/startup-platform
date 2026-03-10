-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "managerEscalatedAt" TIMESTAMP(3),
ADD COLUMN     "managerEscalatedByUserId" TEXT,
ADD COLUMN     "managerEscalationReason" TEXT;

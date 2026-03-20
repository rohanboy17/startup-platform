-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "customTask" TEXT,
ADD COLUMN     "taskCategory" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN     "taskType" TEXT NOT NULL DEFAULT 'Other';

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_businessId_fkey";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "taskId";

-- DropTable
DROP TABLE "Task";

-- DropEnum
DROP TYPE "TaskStatus";

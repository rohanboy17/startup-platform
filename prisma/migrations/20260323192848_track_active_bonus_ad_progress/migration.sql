-- AlterTable
ALTER TABLE "AdWatchSession" ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "requiredSeconds" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;

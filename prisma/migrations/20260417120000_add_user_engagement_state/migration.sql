-- Add server-backed engagement state for mobile retention UI.
-- Additive only: safe for existing deployments.

ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "streakDayKey" TEXT;
ALTER TABLE "User" ADD COLUMN "streakCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "approvedSeenTotal" INTEGER NOT NULL DEFAULT 0;


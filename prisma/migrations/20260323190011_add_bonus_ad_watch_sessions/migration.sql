-- CreateEnum
CREATE TYPE "AdWatchSessionStatus" AS ENUM ('PENDING', 'REWARDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AdWatchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reward" DOUBLE PRECISION NOT NULL,
    "status" "AdWatchSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdWatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdWatchSession_userId_status_createdAt_idx" ON "AdWatchSession"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AdWatchSession_userId_createdAt_idx" ON "AdWatchSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdWatchSession" ADD CONSTRAINT "AdWatchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

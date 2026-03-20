-- CreateEnum
CREATE TYPE "CommunityFeedbackStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CommunityFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "status" "CommunityFeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityFeedback_status_createdAt_idx" ON "CommunityFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityFeedback_userId_createdAt_idx" ON "CommunityFeedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityFeedback" ADD CONSTRAINT "CommunityFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFeedback" ADD CONSTRAINT "CommunityFeedback_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

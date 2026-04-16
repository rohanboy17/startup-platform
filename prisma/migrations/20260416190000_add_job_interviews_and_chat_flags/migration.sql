CREATE TYPE "JobInterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "JobInterviewMode" AS ENUM ('VIRTUAL', 'IN_PERSON', 'PHONE');
CREATE TYPE "JobInterviewAttendanceStatus" AS ENUM ('PENDING', 'ATTENDED', 'NO_SHOW');
CREATE TYPE "JobChatFlagStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

CREATE TABLE "JobApplicationInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "title" TEXT,
    "status" "JobInterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "mode" "JobInterviewMode" NOT NULL DEFAULT 'VIRTUAL',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Calcutta',
    "locationNote" TEXT,
    "meetingProvider" TEXT,
    "meetingUrl" TEXT,
    "adminNote" TEXT,
    "interviewerNotes" TEXT,
    "scorecard" JSONB,
    "rescheduledAt" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "attendanceStatus" "JobInterviewAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "attendedAt" TIMESTAMP(3),
    "attendanceMarkedAt" TIMESTAMP(3),
    "attendanceMarkedByUserId" TEXT,
    "meetingSharedAt" TIMESTAMP(3),
    "meetingSharedByBusinessId" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplicationInterview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplicationChatFlag" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "JobApplicationMessageSenderRole" NOT NULL,
    "message" TEXT NOT NULL,
    "detectedReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "JobChatFlagStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationChatFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobApplicationInterview_applicationId_roundNumber_key" ON "JobApplicationInterview"("applicationId", "roundNumber");
CREATE INDEX "JobApplicationInterview_applicationId_scheduledAt_idx" ON "JobApplicationInterview"("applicationId", "scheduledAt");
CREATE INDEX "JobApplicationInterview_status_scheduledAt_idx" ON "JobApplicationInterview"("status", "scheduledAt");
CREATE INDEX "JobApplicationChatFlag_applicationId_createdAt_idx" ON "JobApplicationChatFlag"("applicationId", "createdAt");
CREATE INDEX "JobApplicationChatFlag_status_createdAt_idx" ON "JobApplicationChatFlag"("status", "createdAt");

ALTER TABLE "JobApplicationInterview"
ADD CONSTRAINT "JobApplicationInterview_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobApplicationChatFlag"
ADD CONSTRAINT "JobApplicationChatFlag_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

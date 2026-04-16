CREATE TYPE "JobApplicationMessageSenderRole" AS ENUM ('USER', 'BUSINESS');

CREATE TABLE "JobApplicationMessage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "JobApplicationMessageSenderRole" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplicationMessage_applicationId_createdAt_idx" ON "JobApplicationMessage"("applicationId", "createdAt");
CREATE INDEX "JobApplicationMessage_senderUserId_createdAt_idx" ON "JobApplicationMessage"("senderUserId", "createdAt");

ALTER TABLE "JobApplicationMessage"
ADD CONSTRAINT "JobApplicationMessage_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobApplicationMessage"
ADD CONSTRAINT "JobApplicationMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

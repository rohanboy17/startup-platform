-- CreateEnum
CREATE TYPE "JobWorkMode" AS ENUM ('WORK_FROM_OFFICE', 'WORK_IN_FIELD', 'HYBRID');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'DAILY_GIG');

-- CreateEnum
CREATE TYPE "JobPayUnit" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED', 'FILLED');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jobCategory" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "customJobType" TEXT,
    "workMode" "JobWorkMode" NOT NULL,
    "employmentType" "JobEmploymentType" NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "addressLine" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "payAmount" DOUBLE PRECISION NOT NULL,
    "payUnit" "JobPayUnit" NOT NULL,
    "shiftSummary" TEXT,
    "startDate" TIMESTAMP(3),
    "applicationDeadline" TIMESTAMP(3),
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minEducation" TEXT,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "coverNote" TEXT,
    "businessNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPosting_businessId_status_createdAt_idx" ON "JobPosting"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "JobPosting_status_city_state_createdAt_idx" ON "JobPosting"("status", "city", "state", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_status_createdAt_idx" ON "JobApplication"("jobId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_userId_status_createdAt_idx" ON "JobApplication"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_userId_key" ON "JobApplication"("jobId", "userId");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

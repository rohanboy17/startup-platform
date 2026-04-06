import { prisma } from "@/lib/prisma";

type SummaryInput = {
  taskDates: Set<string>;
  physicalDates: Set<string>;
  approvedTaskCount: number;
  joinedJobsCount: number;
};

export type WorkExperienceSummary = {
  totalWorkDays: number;
  digitalWorkDays: number;
  physicalWorkDays: number;
  approvedTaskCount: number;
  joinedJobsCount: number;
  activeSince: string | null;
  experienceLabel: string;
};

function dateKey(input: Date) {
  return input.toISOString().slice(0, 10);
}

function startOfDay(input: Date) {
  const value = new Date(input);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function addDateRange(target: Set<string>, from: Date, to: Date) {
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor.getTime() <= end.getTime()) {
    target.add(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

function formatDurationFromDays(totalDays: number) {
  if (totalDays <= 0) return "0 days";
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  return parts.join(" ");
}

function buildSummary(input: SummaryInput): WorkExperienceSummary {
  const union = new Set<string>([...input.taskDates, ...input.physicalDates]);
  const sorted = Array.from(union).sort();
  return {
    totalWorkDays: union.size,
    digitalWorkDays: input.taskDates.size,
    physicalWorkDays: input.physicalDates.size,
    approvedTaskCount: input.approvedTaskCount,
    joinedJobsCount: input.joinedJobsCount,
    activeSince: sorted[0] || null,
    experienceLabel: formatDurationFromDays(union.size),
  };
}

export async function getWorkExperienceMap(userIds: string[]) {
  const normalizedIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, WorkExperienceSummary>();
  if (normalizedIds.length === 0) return result;

  const [approvedSubmissions, joinedJobs] = await Promise.all([
    prisma.submission.findMany({
      where: {
        userId: { in: normalizedIds },
        adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
    prisma.jobApplication.findMany({
      where: {
        userId: { in: normalizedIds },
        status: "JOINED",
        joinedAt: { not: null },
      },
      select: {
        userId: true,
        joinedAt: true,
      },
    }),
  ]);

  const seed = new Map<string, SummaryInput>();
  for (const userId of normalizedIds) {
    seed.set(userId, {
      taskDates: new Set<string>(),
      physicalDates: new Set<string>(),
      approvedTaskCount: 0,
      joinedJobsCount: 0,
    });
  }

  for (const row of approvedSubmissions) {
    const summary = seed.get(row.userId);
    if (!summary) continue;
    summary.taskDates.add(dateKey(row.createdAt));
    summary.approvedTaskCount += 1;
  }

  const now = new Date();
  for (const row of joinedJobs) {
    const summary = seed.get(row.userId);
    if (!summary || !row.joinedAt) continue;
    addDateRange(summary.physicalDates, row.joinedAt, now);
    summary.joinedJobsCount += 1;
  }

  for (const [userId, input] of seed.entries()) {
    result.set(userId, buildSummary(input));
  }

  return result;
}

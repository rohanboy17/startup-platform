import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NotificationItem = {
  key: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING";
  createdAt: string;
  href: string;
};

function maxDate(...dates: Array<Date | null | undefined>) {
  return dates.reduce<Date | null>((acc, curr) => {
    if (!curr) return acc;
    if (!acc) return curr;
    return curr.getTime() > acc.getTime() ? curr : acc;
  }, null);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const hoursRaw = Number(url.searchParams.get("hours") || "24");
  const hours = Number.isFinite(hoursRaw) ? Math.min(168, Math.max(1, hoursRaw)) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);

  const [
    queueCount,
    suspiciousQueueCount,
    adminBacklogCount,
    escalationsCount,
    jobQueueCount,
    suspiciousJobQueueCount,
    adminBacklogJobCount,
    recentSubmissions,
    recentManagerDecisions,
    latestJobApplication,
    latestPendingAdminJobApplication,
  ] = await Promise.all([
    prisma.submission.count({
      where: { campaignId: { not: null }, managerStatus: "PENDING", managerEscalatedAt: null },
    }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "PENDING",
        managerEscalatedAt: null,
        user: { isSuspicious: true },
      },
    }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
      },
    }),
    prisma.submission.count({ where: { managerEscalatedAt: { gte: since } } }),
    prisma.jobApplication.count({
      where: { managerStatus: "PENDING", adminStatus: "PENDING", status: "APPLIED" },
    }),
    prisma.jobApplication.count({
      where: {
        managerStatus: "PENDING",
        adminStatus: "PENDING",
        status: "APPLIED",
        user: { isSuspicious: true },
      },
    }),
    prisma.jobApplication.count({
      where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
    }),
    prisma.submission.findMany({
      where: { createdAt: { gte: since }, ipAddress: { not: null } },
      select: { ipAddress: true, userId: true, createdAt: true },
      take: 6000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.activityLog.findMany({
      where: {
        createdAt: { gte: since },
        entity: "Submission",
        action: { in: ["MANAGER_APPROVED_SUBMISSION", "MANAGER_REJECTED_SUBMISSION"] },
      },
      select: { createdAt: true, action: true, details: true },
      take: 20000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobApplication.findFirst({
      where: { managerStatus: "PENDING", adminStatus: "PENDING", status: "APPLIED" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobApplication.findFirst({
      where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
      select: { createdAt: true, managerReviewedAt: true },
      orderBy: { managerReviewedAt: "desc" },
    }),
  ]);

  const velocityMap = new Map<string, number>();
  for (const row of recentSubmissions) {
    if (row.createdAt < sinceHour) continue;
    velocityMap.set(row.userId, (velocityMap.get(row.userId) || 0) + 1);
  }
  const highVelocityCount = Array.from(velocityMap.values()).filter((count) => count >= 12).length;

  const ipMap = new Map<string, { users: Set<string>; total: number; latest: number }>();
  for (const row of recentSubmissions) {
    const key = row.ipAddress?.split(",")[0]?.trim() || "unknown";
    const current = ipMap.get(key) || { users: new Set<string>(), total: 0, latest: 0 };
    current.total += 1;
    current.users.add(row.userId);
    current.latest = Math.max(current.latest, row.createdAt.getTime());
    ipMap.set(key, current);
  }
  const ipHotspotCount = Array.from(ipMap.values()).filter((value) => value.total >= 15 && value.users.size >= 3).length;

  function extractSubmissionId(details: string | null) {
    if (!details) return null;
    const match = /submissionId=([^,\s]+)/.exec(details);
    return match?.[1] ?? null;
  }

  const submissionIds = Array.from(
    new Set(
      recentManagerDecisions
        .map((row) => extractSubmissionId(row.details))
        .filter((value): value is string => Boolean(value))
    )
  );
  const submissions = submissionIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: submissionIds }, campaignId: { not: null } },
        select: { id: true, campaignId: true },
      })
    : [];

  const campaignIdBySubmissionId = new Map(submissions.map((row) => [row.id, row.campaignId as string]));
  const campaignStats = new Map<string, { decisions: number; rejected: number; latest: number }>();
  for (const row of recentManagerDecisions) {
    const submissionId = extractSubmissionId(row.details);
    if (!submissionId) continue;
    const campaignId = campaignIdBySubmissionId.get(submissionId);
    if (!campaignId) continue;
    const existing = campaignStats.get(campaignId) || { decisions: 0, rejected: 0, latest: 0 };
    existing.decisions += 1;
    if (row.action === "MANAGER_REJECTED_SUBMISSION") existing.rejected += 1;
    existing.latest = Math.max(existing.latest, row.createdAt.getTime());
    campaignStats.set(campaignId, existing);
  }

  const spikeCount = Array.from(campaignStats.values()).filter((value) => {
    if (value.decisions < 12) return false;
    return value.rejected / value.decisions >= 0.7;
  }).length;

  const latestDecisionAt = recentManagerDecisions[0]?.createdAt;
  const latestSubmissionAt = recentSubmissions[0]?.createdAt;
  const latestJobApplicationAt = latestJobApplication?.createdAt;
  const latestPendingAdminJobAt =
    latestPendingAdminJobApplication?.managerReviewedAt || latestPendingAdminJobApplication?.createdAt;
  const latest = maxDate(latestDecisionAt, latestSubmissionAt, latestJobApplicationAt, latestPendingAdminJobAt);

  const items: NotificationItem[] = [];

  if (queueCount > 0) {
    items.push({
      key: "queue",
      title: "New campaigns queue items",
      message: `${queueCount} campaign submission(s) are waiting in the campaigns queue.`,
      severity: "INFO",
      createdAt: (latestSubmissionAt || new Date()).toISOString(),
      href: "/dashboard/manager/submissions",
    });
  }

  if (suspiciousQueueCount > 0) {
    items.push({
      key: "suspicious_queue",
      title: "Flagged campaigns queue items",
      message: `${suspiciousQueueCount} campaign queue item(s) are from flagged users.`,
      severity: "WARNING",
      createdAt: (latestSubmissionAt || new Date()).toISOString(),
      href: "/dashboard/manager/submissions",
    });
  }

  if (jobQueueCount > 0) {
    items.push({
      key: "job_queue",
      title: "New jobs queue items",
      message: `${jobQueueCount} job application(s) are waiting in the jobs queue.`,
      severity: "INFO",
      createdAt: (latestJobApplicationAt || new Date()).toISOString(),
      href: "/dashboard/manager/jobs",
    });
  }

  if (suspiciousJobQueueCount > 0) {
    items.push({
      key: "suspicious_job_queue",
      title: "Flagged jobs queue items",
      message: `${suspiciousJobQueueCount} jobs queue item(s) are from flagged users.`,
      severity: "WARNING",
      createdAt: (latestJobApplicationAt || new Date()).toISOString(),
      href: "/dashboard/manager/jobs",
    });
  }

  if (escalationsCount > 0) {
    items.push({
      key: "escalations",
      title: "Escalations created",
      message: `${escalationsCount} submission(s) were escalated in the last ${hours} hours.`,
      severity: "INFO",
      createdAt: new Date().toISOString(),
      href: "/dashboard/manager/history",
    });
  }

  if (adminBacklogCount > 0 || adminBacklogJobCount > 0) {
    const parts = [
      adminBacklogCount > 0 ? `${adminBacklogCount} submission(s)` : null,
      adminBacklogJobCount > 0 ? `${adminBacklogJobCount} job application(s)` : null,
    ]
      .filter(Boolean)
      .join(" and ");
    items.push({
      key: "admin_backlog",
      title: "Pending admin verification",
      message: `${parts} are waiting for admin verification.`,
      severity: "INFO",
      createdAt: (maxDate(latestDecisionAt, latestPendingAdminJobAt) || new Date()).toISOString(),
      href: "/dashboard/manager/risk",
    });
  }

  if (ipHotspotCount > 0 || highVelocityCount > 0) {
    items.push({
      key: "fraud_signals",
      title: "Suspicious activity signals",
      message: `${ipHotspotCount} IP hotspot(s) and ${highVelocityCount} high-velocity user(s) detected (last ${hours}h).`,
      severity: "WARNING",
      createdAt: (latest || new Date()).toISOString(),
      href: "/dashboard/manager/risk",
    });
  }

  if (spikeCount > 0) {
    items.push({
      key: "rejection_spikes",
      title: "Unusual rejection spikes",
      message: `${spikeCount} campaign(s) show unusually high rejection rate (last ${hours}h).`,
      severity: "WARNING",
      createdAt: (latestDecisionAt || new Date()).toISOString(),
      href: "/dashboard/manager/risk",
    });
  }


  return NextResponse.json({
    hours,
    counts: {
      queue: queueCount,
      suspiciousQueue: suspiciousQueueCount,
      jobQueue: jobQueueCount,
      suspiciousJobQueue: suspiciousJobQueueCount,
      escalations: escalationsCount,
      adminBacklog: adminBacklogCount + adminBacklogJobCount,
      ipHotspots: ipHotspotCount,
      highVelocity: highVelocityCount,
      rejectionSpikes: spikeCount,
    },
    items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
}

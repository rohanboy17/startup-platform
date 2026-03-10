import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function maskIp(input: string | null) {
  if (!input) return "unknown";
  const raw = input.split(",")[0]?.trim() || "";
  if (!raw) return "unknown";
  if (raw.includes(":")) {
    const parts = raw.split(":").filter(Boolean);
    if (parts.length <= 2) return `${raw}:*`;
    return `${parts.slice(0, 3).join(":")}:*`;
  }
  const parts = raw.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  return "unknown";
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
    suspiciousUsers,
    suspiciousQueueCount,
    recentSubmissions,
    adminBacklogCount,
    adminBacklog,
    velocitySubmissions,
    recentManagerDecisions,
    escalatedSubmissions,
    escalationCount,
  ] =
    await Promise.all([
      prisma.user.findMany({
        where: { isSuspicious: true, deletedAt: null },
        orderBy: [{ flaggedAt: "desc" }, { totalRejected: "desc" }],
        take: 25,
        select: {
          id: true,
          name: true,
          level: true,
          totalApproved: true,
          totalRejected: true,
          suspiciousReason: true,
          flaggedAt: true,
        },
      }),
      prisma.submission.count({
        where: { campaignId: { not: null }, managerStatus: "PENDING", user: { isSuspicious: true } },
      }),
      prisma.submission.findMany({
        where: { createdAt: { gte: since }, ipAddress: { not: null } },
        select: { ipAddress: true, userId: true, campaignId: true },
        take: 5000,
      }),
      prisma.submission.count({
        where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
      }),
      prisma.submission.findMany({
        where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, level: true, isSuspicious: true } },
          campaign: { select: { id: true, title: true, category: true } },
        },
      }),
      prisma.submission.findMany({
        where: { createdAt: { gte: sinceHour } },
        select: { userId: true },
        take: 20000,
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
      prisma.submission.findMany({
        where: { managerEscalatedAt: { not: null } },
        orderBy: { managerEscalatedAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, level: true, isSuspicious: true } },
          campaign: { select: { id: true, title: true, category: true } },
        },
      }),
      prisma.submission.count({ where: { managerEscalatedAt: { not: null } } }),
    ]);

  const ipMap = new Map<
    string,
    { total: number; userIds: Set<string>; campaignIds: Set<string> }
  >();
  for (const row of recentSubmissions) {
    const key = row.ipAddress ?? "unknown";
    const current = ipMap.get(key) || { total: 0, userIds: new Set<string>(), campaignIds: new Set<string>() };
    current.total += 1;
    current.userIds.add(row.userId);
    if (row.campaignId) current.campaignIds.add(row.campaignId);
    ipMap.set(key, current);
  }

  const ipHotspots = Array.from(ipMap.entries())
    .map(([ip, value]) => ({
      ipMasked: maskIp(ip),
      totalSubmissions: value.total,
      uniqueUsers: value.userIds.size,
      uniqueCampaigns: value.campaignIds.size,
    }))
    .filter((row) => row.totalSubmissions >= 15 && row.uniqueUsers >= 3)
    .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    .slice(0, 12);

  const velocityCountByUser = new Map<string, number>();
  for (const row of velocitySubmissions) {
    velocityCountByUser.set(row.userId, (velocityCountByUser.get(row.userId) || 0) + 1);
  }
  const velocityTopIds = Array.from(velocityCountByUser.entries())
    .filter(([, count]) => count >= 12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);

  const velocityUsers = velocityTopIds.length
    ? await prisma.user.findMany({
        where: { id: { in: velocityTopIds }, deletedAt: null },
        select: {
          id: true,
          name: true,
          level: true,
          totalApproved: true,
          totalRejected: true,
          isSuspicious: true,
        },
      })
    : [];
  const velocityById = new Map(velocityUsers.map((user) => [user.id, user]));
  const highVelocity = velocityTopIds
    .map((userId) => {
      const user = velocityById.get(userId);
      return user
        ? { ...user, submissionsLastHour: velocityCountByUser.get(userId) || 0 }
        : null;
    })
    .filter(Boolean);

  function extractSubmissionId(details: string | null) {
    if (!details) return null;
    const match = /submissionId=([^,\s]+)/.exec(details);
    return match?.[1] ?? null;
  }

  const decisionSubmissionIds = Array.from(
    new Set(
      recentManagerDecisions
        .map((row) => extractSubmissionId(row.details))
        .filter((value): value is string => Boolean(value))
    )
  );

  const decisionSubmissions = decisionSubmissionIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: decisionSubmissionIds }, campaignId: { not: null } },
        select: { id: true, campaignId: true },
      })
    : [];
  const campaignIdBySubmissionId = new Map(decisionSubmissions.map((row) => [row.id, row.campaignId as string]));

  const campaignStats = new Map<string, { decisions: number; rejected: number; latest: number }>();
  for (const row of recentManagerDecisions) {
    const submissionId = extractSubmissionId(row.details);
    if (!submissionId) continue;
    const campaignId = campaignIdBySubmissionId.get(submissionId);
    if (!campaignId) continue;
    const existing = campaignStats.get(campaignId) || { decisions: 0, rejected: 0, latest: 0 };
    existing.decisions += 1;
    if (row.action === "MANAGER_REJECTED_SUBMISSION") existing.rejected += 1;
    existing.latest = Math.max(existing.latest, new Date(row.createdAt).getTime());
    campaignStats.set(campaignId, existing);
  }

  const spikeCandidates = Array.from(campaignStats.entries())
    .map(([campaignId, value]) => ({
      campaignId,
      decisions: value.decisions,
      rejected: value.rejected,
      rejectionRate: value.decisions > 0 ? value.rejected / value.decisions : 0,
      latestAt: value.latest,
    }))
    .filter((row) => row.decisions >= 12 && row.rejectionRate >= 0.7)
    .sort((a, b) => b.rejectionRate - a.rejectionRate)
    .slice(0, 10);

  const spikeCampaigns = spikeCandidates.length
    ? await prisma.campaign.findMany({
        where: { id: { in: spikeCandidates.map((row) => row.campaignId) } },
        select: { id: true, title: true, category: true },
      })
    : [];
  const spikeById = new Map(spikeCampaigns.map((row) => [row.id, row]));
  const rejectionSpikes = spikeCandidates
    .map((row) => {
      const campaign = spikeById.get(row.campaignId);
      return campaign
        ? {
            ...campaign,
            decisions: row.decisions,
            rejected: row.rejected,
            rejectionRate: row.rejectionRate,
            latestAt: new Date(row.latestAt).toISOString(),
          }
        : null;
    })
    .filter(Boolean);

  const outlierCandidates = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ totalRejected: "desc" }, { totalApproved: "asc" }],
    take: 80,
    select: {
      id: true,
      name: true,
      level: true,
      totalApproved: true,
      totalRejected: true,
      isSuspicious: true,
    },
  });

  const rejectionOutliers = outlierCandidates
    .filter((user) => user.totalRejected >= 10)
    .map((user) => {
      const denom = user.totalApproved + user.totalRejected;
      const rate = denom > 0 ? user.totalRejected / denom : 0;
      return { ...user, rejectionRate: rate };
    })
    .sort((a, b) => b.rejectionRate - a.rejectionRate)
    .slice(0, 12);

  return NextResponse.json({
    windowHours: hours,
    suspiciousQueueCount,
    suspiciousUsers: suspiciousUsers.map((user) => ({
      ...user,
      flaggedAt: user.flaggedAt ? user.flaggedAt.toISOString() : null,
    })),
    ipHotspots,
    highVelocity,
    rejectionSpikes,
    rejectionOutliers,
    escalations: {
      count: escalationCount,
      latest: escalatedSubmissions.map((row) => ({
        id: row.id,
        escalatedAt: row.managerEscalatedAt ? row.managerEscalatedAt.toISOString() : null,
        reason: row.managerEscalationReason,
        user: row.user,
        campaign: row.campaign,
      })),
    },
    adminBacklog: {
      count: adminBacklogCount,
      oldest: adminBacklog.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        user: row.user,
        campaign: row.campaign,
      })),
    },
  });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

function formatHours(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Not enough data";
  if (value < 1) return `${Math.round(value * 60)} min avg`;
  return `${value.toFixed(1)} hr avg`;
}

function ageLabel(from: Date) {
  const diffMs = Date.now() - from.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function parseEntityId(details: string | null | undefined, key: string) {
  if (!details) return null;
  const match = details.match(new RegExp(`${key}=([^,]+)`, "i"));
  return match?.[1] || null;
}

export default async function ManagerDashboardPage() {
  const session = await auth();
  const managerId = session?.user.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pendingQueue, pendingAdmin, suspiciousQueue, approvedToday, rejectedToday, reviewLogs] = await Promise.all([
    prisma.submission.findMany({
      where: { campaignId: { not: null }, managerStatus: "PENDING" },
      select: {
        id: true,
        createdAt: true,
        campaign: { select: { title: true } },
        user: { select: { name: true, level: true, isSuspicious: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
      },
    }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "PENDING",
        user: { isSuspicious: true },
      },
    }),
    prisma.activityLog.count({
      where: {
        userId: managerId,
        action: "MANAGER_APPROVED_SUBMISSION",
        createdAt: { gte: todayStart },
      },
    }),
    prisma.activityLog.count({
      where: {
        userId: managerId,
        action: "MANAGER_REJECTED_SUBMISSION",
        createdAt: { gte: todayStart },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: managerId,
        action: { in: ["MANAGER_APPROVED_SUBMISSION", "MANAGER_REJECTED_SUBMISSION"] },
      },
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const pendingCount = pendingQueue.length;
  const oldestPending = pendingQueue[0]?.createdAt ?? null;

  const reviewSubmissionIds = reviewLogs
    .map((log) => parseEntityId(log.details, "submissionId"))
    .filter((value): value is string => Boolean(value));

  const reviewedSubmissions = reviewSubmissionIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: reviewSubmissionIds } },
        select: { id: true, createdAt: true },
      })
    : [];

  const reviewedMap = new Map(reviewedSubmissions.map((item) => [item.id, item.createdAt]));
  const turnaroundHours: number[] = [];

  for (const log of reviewLogs) {
    const submissionId = parseEntityId(log.details, "submissionId");
    if (!submissionId) continue;
    const createdAt = reviewedMap.get(submissionId);
    if (!createdAt) continue;
    const hours = (log.createdAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) turnaroundHours.push(hours);
  }

  const averageReviewHours =
    turnaroundHours.length > 0
      ? turnaroundHours.reduce((sum, value) => sum + value, 0) / turnaroundHours.length
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Moderation control</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Overview</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Monitor review workload, see what is waiting for admin, and surface suspicious submissions before they move deeper into the system.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Pending queue"
          value={pendingCount}
          tone="warning"
        />
        <KpiCard
          label="Approved today"
          value={approvedToday}
          tone="success"
        />
        <KpiCard
          label="Rejected today"
          value={rejectedToday}
          tone="warning"
        />
        <KpiCard
          label="Waiting for admin"
          value={pendingAdmin}
          tone="info"
        />
        <KpiCard
          label="Suspicious in queue"
          value={suspiciousQueue}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[1.05fr_0.95fr]">
        <SectionCard elevated className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/60">Queue snapshot</p>
              <h3 className="text-xl font-semibold text-white">Oldest items first</h3>
            </div>
            <a href="/dashboard/manager/submissions" className="text-sm text-emerald-200 transition hover:text-emerald-100">
              Open queue
            </a>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
              No submissions are waiting for manager review right now.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white break-words">
                        {submission.campaign?.title || "Campaign submission"}
                      </p>
                      <p className="mt-1 text-sm text-white/60 break-words">
                        {submission.user.name || "Unnamed"} | Level {submission.user.level}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-white/75">{ageLabel(submission.createdAt)} waiting</p>
                      {submission.user.isSuspicious ? (
                        <div className="mt-1">
                          <StatusBadge label="Suspicious" tone="warning" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard elevated className="space-y-4">
          <div>
            <p className="text-sm text-white/60">Review pace</p>
            <h3 className="text-xl font-semibold text-white">How fast the queue is moving</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Average turnaround</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatHours(averageReviewHours)}</p>
              <p className="mt-1 text-xs text-white/45">Measured from submission creation to your manager decision.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Oldest pending item</p>
              <p className="mt-2 text-2xl font-semibold text-white">{oldestPending ? ageLabel(oldestPending) : "Clear"}</p>
              <p className="mt-1 text-xs text-white/45">Longest wait currently sitting in the manager queue.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>Manager scope is limited to first-pass moderation only.</p>
            <p className="mt-2">Financial approval, payout control, and user-role changes remain with admin.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("manager.dashboard");
  const session = await auth();
  const managerId = session?.user.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    pendingSubmissionCount,
    pendingSubmissionQueue,
    pendingAdminSubmissions,
    suspiciousSubmissionQueue,
    pendingJobCount,
    pendingJobQueue,
    pendingAdminJobs,
    suspiciousJobQueue,
    approvedTodaySubmissions,
    rejectedTodaySubmissions,
    approvedTodayJobs,
    rejectedTodayJobs,
    reviewLogs,
  ] = await Promise.all([
    prisma.submission.count({
      where: { campaignId: { not: null }, managerStatus: "PENDING", managerEscalatedAt: null },
    }),
    prisma.submission.findMany({
      where: { campaignId: { not: null }, managerStatus: "PENDING", managerEscalatedAt: null },
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
    prisma.jobApplication.count({
      where: { managerStatus: "PENDING", adminStatus: "PENDING", status: "APPLIED" },
    }),
    prisma.jobApplication.findMany({
      where: { managerStatus: "PENDING", adminStatus: "PENDING", status: "APPLIED" },
      select: {
        id: true,
        createdAt: true,
        job: { select: { title: true } },
        user: { select: { name: true, level: true, isSuspicious: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.jobApplication.count({
      where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
    }),
    prisma.jobApplication.count({
      where: {
        managerStatus: "PENDING",
        adminStatus: "PENDING",
        status: "APPLIED",
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
    prisma.activityLog.count({
      where: {
        userId: managerId,
        action: "MANAGER_APPROVED_JOB_APPLICATION",
        createdAt: { gte: todayStart },
      },
    }),
    prisma.activityLog.count({
      where: {
        userId: managerId,
        action: "MANAGER_REJECTED_JOB_APPLICATION",
        createdAt: { gte: todayStart },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: managerId,
        action: {
          in: [
            "MANAGER_APPROVED_SUBMISSION",
            "MANAGER_REJECTED_SUBMISSION",
            "MANAGER_APPROVED_JOB_APPLICATION",
            "MANAGER_REJECTED_JOB_APPLICATION",
          ],
        },
      },
      select: {
        entity: true,
        action: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const pendingCount = pendingSubmissionCount + pendingJobCount;
  const pendingAdmin = pendingAdminSubmissions + pendingAdminJobs;
  const suspiciousQueue = suspiciousSubmissionQueue + suspiciousJobQueue;
  const approvedToday = approvedTodaySubmissions + approvedTodayJobs;
  const rejectedToday = rejectedTodaySubmissions + rejectedTodayJobs;

  const pendingQueue = [
    ...pendingSubmissionQueue.map((submission) => ({
      id: submission.id,
      kind: "SUBMISSION" as const,
      createdAt: submission.createdAt,
      title: submission.campaign?.title || t("snapshot.fallbackSubmissionTitle"),
      userName: submission.user.name,
      userLevel: submission.user.level,
      isSuspicious: submission.user.isSuspicious,
      href: "/dashboard/manager/submissions",
      kindLabel: t("snapshot.submissionKind"),
    })),
    ...pendingJobQueue.map((application) => ({
      id: application.id,
      kind: "JOB_APPLICATION" as const,
      createdAt: application.createdAt,
      title: application.job.title || t("snapshot.fallbackJobTitle"),
      userName: application.user.name,
      userLevel: application.user.level,
      isSuspicious: application.user.isSuspicious,
      href: "/dashboard/manager/jobs",
      kindLabel: t("snapshot.jobKind"),
    })),
  ]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 6);

  const oldestPending = pendingQueue[0]?.createdAt ?? null;

  const reviewSubmissionIds = reviewLogs
    .filter((log) => log.entity === "Submission")
    .map((log) => parseEntityId(log.details, "submissionId"))
    .filter((value): value is string => Boolean(value));
  const reviewApplicationIds = reviewLogs
    .filter((log) => log.entity === "JobApplication")
    .map((log) => parseEntityId(log.details, "applicationId"))
    .filter((value): value is string => Boolean(value));

  const reviewedSubmissions = reviewSubmissionIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: reviewSubmissionIds } },
        select: { id: true, createdAt: true },
      })
    : [];
  const reviewedApplications = reviewApplicationIds.length
    ? await prisma.jobApplication.findMany({
        where: { id: { in: reviewApplicationIds } },
        select: { id: true, createdAt: true },
      })
    : [];

  const reviewedMap = new Map(reviewedSubmissions.map((item) => [item.id, item.createdAt]));
  const reviewedApplicationMap = new Map(reviewedApplications.map((item) => [item.id, item.createdAt]));
  const turnaroundHours: number[] = [];

  for (const log of reviewLogs) {
    const createdAt =
      log.entity === "JobApplication"
        ? reviewedApplicationMap.get(parseEntityId(log.details, "applicationId") || "")
        : reviewedMap.get(parseEntityId(log.details, "submissionId") || "");
    if (!createdAt) continue;
    const hours = (log.createdAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) turnaroundHours.push(hours);
  }

  const averageReviewHours =
    turnaroundHours.length > 0
      ? turnaroundHours.reduce((sum, value) => sum + value, 0) / turnaroundHours.length
      : 0;
  const averageReviewLabel =
    !Number.isFinite(averageReviewHours) || averageReviewHours <= 0
      ? t("notEnoughData")
      : averageReviewHours < 1
        ? t("minAvg", { count: Math.round(averageReviewHours * 60) })
        : t("hrAvg", { count: averageReviewHours.toFixed(1) });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label={t("kpis.waitingForReview")}
          value={pendingCount}
          tone="warning"
        />
        <KpiCard
          label={t("kpis.approvedToday")}
          value={approvedToday}
          tone="success"
        />
        <KpiCard
          label={t("kpis.rejectedToday")}
          value={rejectedToday}
          tone="warning"
        />
        <KpiCard
          label={t("kpis.waitingForAdmin")}
          value={pendingAdmin}
          tone="info"
        />
        <KpiCard
          label={t("kpis.flaggedForReview")}
          value={suspiciousQueue}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[1.05fr_0.95fr]">
        <SectionCard elevated className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-foreground/60">{t("snapshot.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("snapshot.title")}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a
                href="/dashboard/manager/submissions"
                className="text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100"
              >
                {t("snapshot.openSubmissions")}
              </a>
              <a
                href="/dashboard/manager/jobs"
                className="text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100"
              >
                {t("snapshot.openJobs")}
              </a>
            </div>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.03] p-6 text-sm text-foreground/60">
              {t("snapshot.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((item) => (
                <div key={`${item.kind}:${item.id}`} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground break-words">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-foreground/60 break-words">
                        {item.kindLabel} | {(item.userName || t("snapshot.unnamed"))} |{" "}
                        {t("snapshot.level", { level: item.userLevel })}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-foreground/75">{t("snapshot.inReview", { age: ageLabel(item.createdAt) })}</p>
                      {item.isSuspicious ? (
                        <div className="mt-1">
                          <StatusBadge label={t("snapshot.suspicious")} tone="warning" />
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
            <p className="text-sm text-foreground/60">{t("pace.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("pace.title")}</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("pace.averageTurnaround")}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{averageReviewLabel}</p>
              <p className="mt-1 text-xs text-foreground/45">{t("pace.averageTurnaroundHelp")}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("pace.oldestPending")}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{oldestPending ? ageLabel(oldestPending) : t("clear")}</p>
              <p className="mt-1 text-xs text-foreground/45">{t("pace.oldestPendingHelp")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/65">
            <p>{t("access.firstPassOnly")}</p>
            <p className="mt-2">{t("access.adminControls")}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

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

  const [pendingCount, pendingQueue, pendingAdmin, suspiciousQueue, approvedToday, rejectedToday, reviewLogs] = await Promise.all([
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
            <a href="/dashboard/manager/submissions" className="text-sm text-emerald-200 transition hover:text-emerald-100">
              {t("snapshot.openSubmissions")}
            </a>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
              {t("snapshot.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white break-words">
                        {submission.campaign?.title || t("snapshot.fallbackTitle")}
                      </p>
                      <p className="mt-1 text-sm text-white/60 break-words">
                        {(submission.user.name || t("snapshot.unnamed"))} | {t("snapshot.level", { level: submission.user.level })}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-white/75">{t("snapshot.inReview", { age: ageLabel(submission.createdAt) })}</p>
                      {submission.user.isSuspicious ? (
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
            <p className="text-sm text-white/60">{t("pace.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("pace.title")}</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("pace.averageTurnaround")}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{averageReviewLabel}</p>
              <p className="mt-1 text-xs text-white/45">{t("pace.averageTurnaroundHelp")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("pace.oldestPending")}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{oldestPending ? ageLabel(oldestPending) : t("clear")}</p>
              <p className="mt-1 text-xs text-white/45">{t("pace.oldestPendingHelp")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>{t("access.firstPassOnly")}</p>
            <p className="mt-2">{t("access.adminControls")}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

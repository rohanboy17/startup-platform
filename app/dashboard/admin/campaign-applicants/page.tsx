import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminV2SubmissionActions from "@/components/admin-v2-submission-actions";
import AdminV2SubmissionBulkActions from "@/components/admin-v2-submission-bulk-actions";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import ProofImageDialog from "@/components/proof-image-dialog";
import { getTranslations } from "next-intl/server";

type SearchParams = {
  q?: string;
  sort?: "newest" | "fraud";
  limit?: string;
};

function isLikelyScreenshotUrl(value: string | null | undefined) {
  if (!value) return false;
  if (!/^https:\/\//i.test(value)) return false;
  if (value.includes("res.cloudinary.com") && value.includes("/task_proofs/")) return true;
  return /\.(webp|png|jpe?g)$/i.test(value);
}

function getFraudScore(opts: {
  ipSubmissionCount: number;
  rapidSubmissionCount: number;
  hasLowDetailProof: boolean;
}) {
  let score = 0;
  if (opts.ipSubmissionCount >= 8) score += 50;
  else if (opts.ipSubmissionCount >= 5) score += 35;
  else if (opts.ipSubmissionCount >= 3) score += 20;

  if (opts.rapidSubmissionCount >= 5) score += 40;
  else if (opts.rapidSubmissionCount >= 3) score += 25;
  else if (opts.rapidSubmissionCount >= 2) score += 10;

  if (opts.hasLowDetailProof) score += 20;
  return score;
}

export default async function AdminCampaignApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const navT = await getTranslations("dashboard.nav");
  const t = await getTranslations("admin.campaignApplicantsPage");
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const sort = params.sort || "fraud";
  const limit = params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const now = new Date();

  const [submissions, recentlyReviewed] = await Promise.all([
    prisma.submission.findMany({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
        ...(q
          ? {
              OR: [
                { proof: { contains: q, mode: "insensitive" } },
                { proofText: { contains: q, mode: "insensitive" } },
                { proofLink: { contains: q, mode: "insensitive" } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
                { campaign: { title: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, level: true },
        },
        campaign: {
          select: { title: true, category: true, rewardPerTask: true, remainingBudget: true },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.submission.findMany({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: { in: ["ADMIN_APPROVED", "ADMIN_REJECTED"] },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, level: true },
        },
        campaign: {
          select: { title: true, category: true, rewardPerTask: true, remainingBudget: true },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
  ]);

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const ips = Array.from(new Set(submissions.map((s) => s.ipAddress).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(submissions.map((s) => s.user.id)));

  const [ipCounts, rapidUserCounts, recentActivityLogs] = await Promise.all([
    ips.length > 0
      ? prisma.submission.groupBy({
          by: ["ipAddress"],
          where: {
            ipAddress: { in: ips },
            createdAt: { gte: oneDayAgo },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.submission.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            createdAt: { gte: tenMinutesAgo },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.activityLog.findMany({
      where: {
        entity: "Submission",
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        action: {
          startsWith: "ADMIN_",
        },
      },
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const ipCountMap = new Map(ipCounts.map((row) => [row.ipAddress || "unknown", row._count._all]));
  const rapidCountMap = new Map(rapidUserCounts.map((row) => [row.userId, row._count._all]));

  const pendingWithFraud = submissions.map((submission) => {
    const ipCount = submission.ipAddress ? (ipCountMap.get(submission.ipAddress) || 0) : 0;
    const rapidCount = rapidCountMap.get(submission.user.id) || 0;
    const lowDetail = !submission.proofLink && !submission.proofText && !submission.proofImage;
    return {
      ...submission,
      fraudScore: getFraudScore({
        ipSubmissionCount: ipCount,
        rapidSubmissionCount: rapidCount,
        hasLowDetailProof: lowDetail,
      }),
    };
  });

  const sortedPending =
    sort === "fraud"
      ? [...pendingWithFraud].sort((a, b) => b.fraudScore - a.fraudScore || b.createdAt.getTime() - a.createdAt.getTime())
      : [...pendingWithFraud].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  function getSubmissionHistory(submissionId: string) {
    return recentActivityLogs.filter((log) => (log.details || "").includes(`submissionId=${submissionId}`)).slice(0, 6);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{navT("campaignApplicants")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.pending")} value={sortedPending.length} tone="warning" />
        <KpiCard label={t("kpis.highFraud")} value={sortedPending.filter((item) => item.fraudScore >= 50).length} tone="danger" />
        <KpiCard label={t("kpis.lowDetail")} value={sortedPending.filter((item) => !item.proofLink && !item.proofText && !item.proofImage).length} tone="warning" />
        <KpiCard label={t("kpis.recentlyReviewed")} value={recentlyReviewed.length} tone="info" />
      </div>

      <SectionCard elevated className="p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t("filters.searchPlaceholder")}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="fraud">{t("filters.sortFraud")}</option>
            <option value="newest">{t("filters.sortNewest")}</option>
          </select>
          <select
            name="limit"
            defaultValue={limit ? String(limit) : "ALL"}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="5">{t("filters.show5")}</option>
            <option value="10">{t("filters.show10")}</option>
            <option value="20">{t("filters.show20")}</option>
            <option value="ALL">{t("filters.showAll")}</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.10]"
          >
            {t("filters.apply")}
          </button>
        </form>
      </SectionCard>

      {sortedPending.length > 0 ? (
        <AdminV2SubmissionBulkActions
          items={sortedPending.map((submission) => ({
            id: submission.id,
            label: `${submission.campaign?.title || "Campaign"} | ${submission.user.email}`,
            fraudScore: submission.fraudScore,
          }))}
        />
      ) : null}

      <div className="space-y-4">
        {sortedPending.length === 0 ? (
            <Card className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="p-6 text-sm text-foreground/60">
                {t("empty.pending")}
              </CardContent>
            </Card>
        ) : (
          sortedPending.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{submission.campaign?.title || "Campaign"}</p>
                  <p className="text-sm text-foreground/70">
                    {t("labels.reward")}: INR {formatMoney(submission.campaign?.rewardPerTask)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/70">{t("labels.fraudScore")}:</span>
                  <StatusBadge
                    label={String(submission.fraudScore)}
                    tone={submission.fraudScore >= 70 ? "danger" : submission.fraudScore >= 40 ? "warning" : "neutral"}
                  />
                </div>
                <p className="break-all text-sm text-foreground/70">
                  {t("labels.user")}: {submission.user.name || t("fallback.unnamed")} ({submission.user.email}) | {t("labels.level")}: {submission.user.level}
                </p>
                <p className="text-sm text-foreground/70">{t("labels.category")}: {submission.campaign?.category || "-"}</p>
                <p className="text-sm text-foreground/70">
                  {t("labels.budgetLeft")}: INR {formatMoney(submission.campaign?.remainingBudget)}
                </p>
                <div className="space-y-2">
                  <p className="break-all text-sm text-foreground/70">
                    {t("labels.proof")}:{" "}
                    {submission.proofText ||
                      submission.proofLink ||
                      ((submission.proofImage || isLikelyScreenshotUrl(submission.proof)) ? t("fallback.screenshotProof") : null) ||
                      submission.proof}
                  </p>
                  <div className="flex flex-col gap-2 text-sm lg:flex-row lg:flex-wrap lg:items-center">
                    {submission.proofLink ? (
                      <a
                        href={submission.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center gap-1 text-emerald-700 underline underline-offset-4 dark:text-emerald-200 lg:w-auto"
                      >
                        {t("actions.viewLink")}
                      </a>
                    ) : null}
                    {(() => {
                      const screenshotUrl =
                        submission.proofImage || (isLikelyScreenshotUrl(submission.proof) ? submission.proof : null);
                      return screenshotUrl ? <ProofImageDialog url={screenshotUrl} label={t("actions.previewScreenshot")} /> : null;
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {submission.ipAddress && (ipCountMap.get(submission.ipAddress) || 0) >= 5 ? (
                    <StatusBadge
                      label={t("badges.ipAnomaly", { count: (ipCountMap.get(submission.ipAddress) || 0).toString() })}
                      tone="warning"
                    />
                  ) : null}
                  {(rapidCountMap.get(submission.user.id) || 0) >= 3 ? (
                    <StatusBadge
                      label={t("badges.timeAnomaly", { count: (rapidCountMap.get(submission.user.id) || 0).toString() })}
                      tone="danger"
                    />
                  ) : null}
                  {!submission.proofLink && !submission.proofText && !submission.proofImage ? (
                    <StatusBadge label={t("badges.lowDetail")} tone="warning" />
                  ) : null}
                </div>
                <p className="text-xs text-foreground/50">{t("labels.submitted")}: {new Date(submission.createdAt).toLocaleString()}</p>

                <AdminV2SubmissionActions submissionId={submission.id} allowEscalate />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{t("recent.title")}</h3>
        {recentlyReviewed.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/60">{t("recent.empty")}</CardContent>
          </Card>
        ) : (
          recentlyReviewed.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{submission.campaign?.title || "Campaign"}</p>
                  <StatusBadge
                    label={`Admin: ${submission.adminStatus}`}
                    tone={submission.adminStatus === "ADMIN_APPROVED" ? "success" : "danger"}
                  />
                </div>
                <p className="break-all text-sm text-foreground/70">
                  {t("labels.user")}: {submission.user.name || t("fallback.unnamed")} ({submission.user.email})
                </p>
                <p className="break-all text-sm text-foreground/70">
                  {t("labels.proof")}:{" "}
                  {submission.proofText ||
                    submission.proofLink ||
                    ((submission.proofImage || isLikelyScreenshotUrl(submission.proof)) ? t("fallback.screenshotProof") : null) ||
                    submission.proof}
                </p>
                <p className="text-xs text-foreground/50">{t("labels.submitted")}: {new Date(submission.createdAt).toLocaleString()}</p>

                <div className="flex flex-col gap-2 text-sm lg:flex-row lg:flex-wrap lg:items-center">
                  {submission.proofLink ? (
                    <a
                      href={submission.proofLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center gap-1 text-emerald-700 underline underline-offset-4 dark:text-emerald-200 lg:w-auto"
                    >
                      {t("actions.viewLink")}
                    </a>
                  ) : null}
                  {(() => {
                    const screenshotUrl =
                      submission.proofImage || (isLikelyScreenshotUrl(submission.proof) ? submission.proof : null);
                    return screenshotUrl ? <ProofImageDialog url={screenshotUrl} label={t("actions.previewScreenshot")} /> : null;
                  })()}
                </div>

                <div className="space-y-2 rounded-md border border-foreground/10 bg-foreground/[0.04] p-3">
                  <p className="text-xs text-foreground/70">{t("recent.undoHistory")}</p>
                  {getSubmissionHistory(submission.id).length === 0 ? (
                    <p className="text-xs text-foreground/50">{t("recent.noHistory")}</p>
                  ) : (
                    getSubmissionHistory(submission.id).map((log, idx) => (
                      <p key={`${submission.id}-${idx}`} className="text-xs text-foreground/60">
                        {new Date(log.createdAt).toLocaleString()} | {log.action} | {log.details}
                      </p>
                    ))
                  )}
                </div>

                <AdminV2SubmissionActions submissionId={submission.id} allowReopen allowEscalate />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

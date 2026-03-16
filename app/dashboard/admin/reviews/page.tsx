import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminV2SubmissionActions from "@/components/admin-v2-submission-actions";
import AdminV2SubmissionBulkActions from "@/components/admin-v2-submission-bulk-actions";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import ProofImageDialog from "@/components/proof-image-dialog";

type SearchParams = {
  q?: string;
  sort?: "newest" | "fraud";
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

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const sort = params.sort || "fraud";
  const now = new Date();
  const submissions = await prisma.submission.findMany({
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
  });

  const recentlyReviewed = await prisma.submission.findMany({
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
    take: 20,
  });

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const ips = Array.from(new Set(submissions.map((s) => s.ipAddress).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(submissions.map((s) => s.user.id)));

  const [ipCounts, rapidUserCounts] = await Promise.all([
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

  const historyCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentActivityLogs = await prisma.activityLog.findMany({
    where: {
      entity: "Submission",
      createdAt: { gte: historyCutoff },
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
  });

  function getSubmissionHistory(submissionId: string) {
    return recentActivityLogs.filter((log) => (log.details || "").includes(`submissionId=${submissionId}`)).slice(0, 6);
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Final Admin Verification</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Pending Verification" value={sortedPending.length} tone="warning" />
        <KpiCard label="Recently Reviewed" value={recentlyReviewed.length} tone="info" />
        <KpiCard label="High Fraud Items" value={sortedPending.filter((item) => item.fraudScore >= 50).length} tone="danger" />
      </div>

      <SectionCard elevated className="p-4">
          <form className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search campaign / user / proof"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="fraud">Sort by Fraud Score</option>
              <option value="newest">Sort by Newest</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
            >
              Apply
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
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No manager-approved submissions pending admin verification.
            </CardContent>
          </Card>
        ) : (
          sortedPending.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{submission.campaign?.title || "Campaign"}</p>
                  <p className="text-sm text-white/70">
                    Reward: INR {formatMoney(submission.campaign?.rewardPerTask)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Fraud Score:</span>
                  <StatusBadge
                    label={String(submission.fraudScore)}
                    tone={submission.fraudScore >= 70 ? "danger" : submission.fraudScore >= 40 ? "warning" : "neutral"}
                  />
                </div>
                <p className="break-all text-sm text-white/70">
                  User: {submission.user.name || "Unnamed"} ({submission.user.email}) | Level:{" "}
                  {submission.user.level}
                </p>
                <p className="text-sm text-white/70">Category: {submission.campaign?.category || "-"}</p>
                <p className="text-sm text-white/70">
                  Budget left: INR {formatMoney(submission.campaign?.remainingBudget)}
                </p>
                <div className="space-y-2">
                  <p className="break-words text-sm text-white/70">
                    Proof:{" "}
                    {submission.proofText ||
                      submission.proofLink ||
                      ((submission.proofImage || isLikelyScreenshotUrl(submission.proof)) ? "Screenshot proof uploaded." : null) ||
                      submission.proof}
                  </p>
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
                    {submission.proofLink ? (
                      <a
                        href={submission.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-200 underline underline-offset-4"
                      >
                        View link
                      </a>
                    ) : null}
                    {(() => {
                      const screenshotUrl =
                        submission.proofImage || (isLikelyScreenshotUrl(submission.proof) ? submission.proof : null);
                      return screenshotUrl ? (
                        <ProofImageDialog url={screenshotUrl} label="Preview screenshot" />
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {submission.ipAddress &&
                  (ipCountMap.get(submission.ipAddress) || 0) >= 5 ? (
                    <StatusBadge
                      label={`IP anomaly: ${(ipCountMap.get(submission.ipAddress) || 0).toString()} in 24h`}
                      tone="warning"
                    />
                  ) : null}
                  {(rapidCountMap.get(submission.user.id) || 0) >= 3 ? (
                    <StatusBadge
                      label={`Time anomaly: ${(rapidCountMap.get(submission.user.id) || 0).toString()} in 10m`}
                      tone="danger"
                    />
                  ) : null}
                  {!submission.proofLink && !submission.proofText && !submission.proofImage ? (
                    <StatusBadge label="Low-detail proof" tone="warning" />
                  ) : null}
                </div>
                <p className="text-xs text-white/50">
                  Submitted: {new Date(submission.createdAt).toLocaleString()}
                </p>

                <AdminV2SubmissionActions submissionId={submission.id} allowEscalate />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Recently Reviewed (Undo / Re-open)</h3>
        {recentlyReviewed.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No reviewed submissions yet.
            </CardContent>
          </Card>
        ) : (
          recentlyReviewed.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{submission.campaign?.title || "Campaign"}</p>
                  <StatusBadge label={`Admin: ${submission.adminStatus}`} tone={submission.adminStatus === "ADMIN_APPROVED" ? "success" : "danger"} />
                </div>
                <p className="break-all text-sm text-white/70">
                  User: {submission.user.name || "Unnamed"} ({submission.user.email})
                </p>
                <p className="break-words text-sm text-white/70">
                  Proof:{" "}
                  {submission.proofText ||
                    submission.proofLink ||
                    ((submission.proofImage || isLikelyScreenshotUrl(submission.proof)) ? "Screenshot proof uploaded." : null) ||
                    submission.proof}
                </p>
                <p className="text-xs text-white/50">
                  Submitted: {new Date(submission.createdAt).toLocaleString()}
                </p>

                <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-white/70">Undo History</p>
                  {getSubmissionHistory(submission.id).length === 0 ? (
                    <p className="text-xs text-white/50">No admin history found.</p>
                  ) : (
                    getSubmissionHistory(submission.id).map((log, idx) => (
                      <p key={`${submission.id}-${idx}`} className="text-xs text-white/60">
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

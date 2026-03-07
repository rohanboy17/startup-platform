import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminV2SubmissionActions from "@/components/admin-v2-submission-actions";
import { formatMoney } from "@/lib/format-money";

export default async function AdminReviewsPage() {
  const now = new Date();
  const submissions = await prisma.submission.findMany({
    where: {
      campaignId: { not: null },
      managerStatus: "MANAGER_APPROVED",
      adminStatus: "PENDING",
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

  const ipCountMap = new Map(
    ipCounts.map((row) => [row.ipAddress || "unknown", row._count._all])
  );
  const rapidCountMap = new Map(rapidUserCounts.map((row) => [row.userId, row._count._all]));

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Final Admin Verification</h2>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No manager-approved submissions pending admin verification.
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{submission.campaign?.title || "Campaign"}</p>
                  <p className="text-sm text-white/70">
                    Reward: INR {formatMoney(submission.campaign?.rewardPerTask)}
                  </p>
                </div>
                <p className="text-sm text-white/70">
                  User: {submission.user.name || "Unnamed"} ({submission.user.email}) | Level:{" "}
                  {submission.user.level}
                </p>
                <p className="text-sm text-white/70">Category: {submission.campaign?.category || "-"}</p>
                <p className="text-sm text-white/70">
                  Budget left: INR {formatMoney(submission.campaign?.remainingBudget)}
                </p>
                <p className="text-sm text-white/70">Proof: {submission.proofText || submission.proofLink || submission.proof}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {submission.ipAddress &&
                  (ipCountMap.get(submission.ipAddress) || 0) >= 5 ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-500/20 px-2 py-1 text-amber-200">
                      IP anomaly: {(ipCountMap.get(submission.ipAddress) || 0).toString()} submissions in 24h
                    </span>
                  ) : null}
                  {(rapidCountMap.get(submission.user.id) || 0) >= 3 ? (
                    <span className="rounded-full border border-rose-300/30 bg-rose-500/20 px-2 py-1 text-rose-200">
                      Time anomaly: {(rapidCountMap.get(submission.user.id) || 0).toString()} in 10m
                    </span>
                  ) : null}
                  {!submission.proofLink && !submission.proofText ? (
                    <span className="rounded-full border border-yellow-300/30 bg-yellow-500/20 px-2 py-1 text-yellow-100">
                      Low-detail proof
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-white/50">
                  Submitted: {new Date(submission.createdAt).toLocaleString()}
                </p>

                <AdminV2SubmissionActions submissionId={submission.id} />
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
                  <p className="text-sm text-white/70">Admin Status: {submission.adminStatus}</p>
                </div>
                <p className="text-sm text-white/70">
                  User: {submission.user.name || "Unnamed"} ({submission.user.email})
                </p>
                <p className="text-sm text-white/70">
                  Proof: {submission.proofText || submission.proofLink || submission.proof}
                </p>
                <p className="text-xs text-white/50">
                  Submitted: {new Date(submission.createdAt).toLocaleString()}
                </p>
                <AdminV2SubmissionActions submissionId={submission.id} allowReopen />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import ManagerSubmissionActions from "@/components/manager-submission-actions";
import { formatMoney } from "@/lib/format-money";

export default async function ManagerSubmissionsPage() {
  const submissions = await prisma.submission.findMany({
    where: {
      campaignId: { not: null },
      managerStatus: "PENDING",
    },
    include: {
      user: {
        select: { name: true, email: true, level: true },
      },
      campaign: {
        select: { title: true, category: true, rewardPerTask: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Manager Submission Queue</h2>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No pending submissions for manager review.
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
                <p className="text-sm text-white/70">Category: {submission.campaign?.category || "-"}</p>
                <p className="text-sm text-white/70">
                  User: {submission.user.name || "Unnamed"} ({submission.user.email}) | Level:{" "}
                  {submission.user.level}
                </p>
                <p className="text-sm text-white/70">Proof: {submission.proofText || submission.proofLink || submission.proof}</p>
                <p className="text-xs text-white/50">
                  Submitted: {new Date(submission.createdAt).toLocaleString()}
                </p>

                <ManagerSubmissionActions submissionId={submission.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

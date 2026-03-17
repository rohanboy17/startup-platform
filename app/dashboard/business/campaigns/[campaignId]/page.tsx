import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { getBusinessContext } from "@/lib/business-context";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { Card, CardContent } from "@/components/ui/card";
import BusinessCampaignEditor from "@/components/business-campaign-editor";
import CampaignTutorialVideo from "@/components/campaign-tutorial-video";

function statusTone(status: string) {
  if (status === "LIVE") return "bg-emerald-400/15 text-emerald-200 border-emerald-400/20";
  if (status === "PENDING") return "bg-amber-400/15 text-amber-100 border-amber-400/20";
  if (status === "APPROVED") return "bg-sky-400/15 text-sky-100 border-sky-400/20";
  if (status === "COMPLETED") return "bg-white/10 text-white border-white/15";
  return "bg-rose-400/15 text-rose-100 border-rose-400/20";
}

export default async function BusinessCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    redirect("/dashboard");
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    redirect("/dashboard");
  }

  const { campaignId } = await params;
  const [campaign, wallet] = await Promise.all([
    prisma.campaign.findFirst({
      where: {
        id: campaignId,
        businessId: context.businessUserId,
      },
      include: {
        instructions: {
          orderBy: { sequence: "asc" },
        },
        submissions: {
          select: {
            id: true,
            proof: true,
            managerStatus: true,
            adminStatus: true,
            rewardAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    ensureBusinessWalletSynced(context.businessUserId),
  ]);

  if (!campaign) {
    notFound();
  }

  const approvedCount = campaign.submissions.filter(
    (submission) => submission.adminStatus === "ADMIN_APPROVED"
  ).length;
  const rejectedCount = campaign.submissions.filter(
    (submission) => submission.adminStatus === "ADMIN_REJECTED"
  ).length;
  const pendingCount = campaign.submissions.filter((submission) => submission.adminStatus === "PENDING").length;
  const spentBudget = campaign.totalBudget - campaign.remainingBudget;
  const totalSlots =
    campaign.rewardPerTask > 0 ? Math.floor(campaign.totalBudget / campaign.rewardPerTask) : 0;
  const usedSlots = campaign.submissions.length;
  const slotsLeft = Math.max(0, totalSlots - usedSlots);
  const deployment = campaign.totalBudget > 0 ? Math.round((spentBudget / campaign.totalBudget) * 100) : 0;

  const activityItems = [
    {
      id: `campaign-created-${campaign.id}`,
      label: `Campaign created and entered ${campaign.status.toLowerCase()} state.`,
      createdAt: campaign.createdAt,
    },
    ...campaign.submissions.slice(0, 8).map((submission) => ({
      id: submission.id,
      label:
        submission.adminStatus === "ADMIN_APPROVED"
          ? `Submission approved. Net payout INR ${formatMoney(submission.rewardAmount)}.`
          : submission.adminStatus === "ADMIN_REJECTED"
            ? "Submission rejected during admin review."
            : submission.managerStatus === "MANAGER_APPROVED"
              ? "Submission is waiting for final approval."
              : "Submission received and waiting for review.",
      createdAt: submission.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/business/campaigns" className="text-sm text-white/60 transition hover:text-white">
            Back to campaigns
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold md:text-4xl">{campaign.title}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(campaign.status)}`}>
              {campaign.status}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">{campaign.description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {campaign.taskLink ? (
            <Link
              href={campaign.taskLink}
              target="_blank"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 sm:w-auto"
            >
              Open task link
            </Link>
          ) : null}
          <Link
            href="/dashboard/business/analytics"
            className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/20 sm:w-auto"
          >
            Open analytics
          </Link>
        </div>
      </div>

      <BusinessCampaignEditor
        campaign={{
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          category: campaign.category,
          taskLink: campaign.taskLink,
          rewardPerTask: campaign.rewardPerTask,
          totalBudget: campaign.totalBudget,
          remainingBudget: campaign.remainingBudget,
          instructions: campaign.instructions.map((instruction) => ({
            id: instruction.id,
            instructionText: instruction.instructionText,
            sequence: instruction.sequence,
          })),
          submissionCount: campaign.submissions.length,
        }}
        walletBalance={wallet.balance}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Category</p>
            <p className="mt-2 text-lg font-semibold text-white">{getCampaignCategoryLabel(campaign.category)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Reward per task</p>
            <p className="mt-2 text-lg font-semibold text-emerald-200">
              INR {formatMoney(campaign.rewardPerTask)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Budget left</p>
            <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(campaign.remainingBudget)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Slots left</p>
            <p className="mt-2 text-lg font-semibold text-white">{slotsLeft}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Budget performance</p>
              <h3 className="text-xl font-semibold text-white">Campaign economics</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Total budget</p>
                <p className="mt-2 text-xl font-semibold text-white">INR {formatMoney(campaign.totalBudget)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Spent so far</p>
                <p className="mt-2 text-xl font-semibold text-white">INR {formatMoney(spentBudget)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Total slots</p>
                <p className="mt-2 text-xl font-semibold text-white">{totalSlots}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Used slots</p>
                <p className="mt-2 text-xl font-semibold text-white">{usedSlots}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <span>Budget deployment</span>
                <span>{deployment}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${deployment}%` }} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Approved</p>
                <p className="mt-2 text-xl font-semibold text-emerald-200">{approvedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Pending</p>
                <p className="mt-2 text-xl font-semibold text-amber-100">{pendingCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Rejected</p>
                <p className="mt-2 text-xl font-semibold text-rose-100">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Task details</p>
              <h3 className="text-xl font-semibold text-white">Instruction checklist</h3>
            </div>

            {campaign.tutorialVideoUrl ? (
              <CampaignTutorialVideo
                videoUrl={campaign.tutorialVideoUrl}
                eyebrow="How-to video"
                title="What users will watch before they submit"
                body="This admin-managed guide appears on the task page so users can understand the work before sending proof."
                openLabel="Open video in new tab"
              />
            ) : null}

            {campaign.instructions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                No task details added for this campaign.
              </div>
            ) : (
              <ol className="space-y-3">
                {campaign.instructions.map((instruction) => (
                  <li key={instruction.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80 break-words">
                    <span className="mr-2 text-white/40">{instruction.sequence}.</span>
                    {instruction.instructionText}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-sm text-white/60">Activity timeline</p>
            <h3 className="text-xl font-semibold text-white">Recent campaign events</h3>
          </div>

          {activityItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
              No campaign activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activityItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="break-words text-sm text-white/85">{item.label}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {item.createdAt.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

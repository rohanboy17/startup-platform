import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { getBusinessContext } from "@/lib/business-context";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { getAppSettings } from "@/lib/system-settings";
import { getEffectiveTaskLabel } from "@/lib/task-categories";
import { Card, CardContent } from "@/components/ui/card";
import BusinessCampaignEditor from "@/components/business-campaign-editor";
import CampaignTutorialVideo from "@/components/campaign-tutorial-video";

function statusTone(status: string) {
  if (status === "LIVE") return "bg-emerald-400/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/20";
  if (status === "PENDING") return "bg-amber-400/15 text-amber-900 dark:text-amber-100 border-amber-400/20";
  if (status === "APPROVED") return "bg-sky-400/15 text-sky-900 dark:text-sky-100 border-sky-400/20";
  if (status === "COMPLETED") return "bg-foreground/[0.04] text-foreground border-foreground/15";
  return "bg-rose-400/15 text-rose-900 dark:text-rose-100 border-rose-400/20";
}

export default async function BusinessCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const t = await getTranslations("business.campaignDetailPage");
  const locale = await getLocale();
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    redirect("/dashboard");
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    redirect("/dashboard");
  }

  const { campaignId } = await params;
  const [campaign, wallet, settings] = await Promise.all([
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
    getAppSettings(),
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
  const deployment = campaign.totalBudget > 0 ? Math.round((spentBudget / campaign.totalBudget) * 100) : 0;
  const effectiveTaskLabel = getEffectiveTaskLabel(campaign.taskType, campaign.customTask);

  const activityItems = [
    {
      id: `campaign-created-${campaign.id}`,
      label: t("activity.created", { status: campaign.status.toLowerCase() }),
      createdAt: campaign.createdAt,
    },
    ...campaign.submissions.slice(0, 8).map((submission) => ({
      id: submission.id,
      label:
        submission.adminStatus === "ADMIN_APPROVED"
          ? t("activity.submissionApproved", { amount: formatMoney(submission.rewardAmount) })
          : submission.adminStatus === "ADMIN_REJECTED"
            ? t("activity.submissionRejected")
            : submission.managerStatus === "MANAGER_APPROVED"
              ? t("activity.waitingFinalApproval")
              : t("activity.waitingReview"),
      createdAt: submission.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/business/campaigns" className="text-sm text-foreground/60 transition hover:text-foreground">
            {t("backToCampaigns")}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold md:text-4xl">{campaign.title}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(campaign.status)}`}>
              {campaign.status}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">{campaign.description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {campaign.taskLink ? (
            <Link
              href={campaign.taskLink}
              target="_blank"
              className="inline-flex w-full items-center justify-center rounded-xl border border-foreground/15 bg-background/60 px-4 py-2 text-sm text-foreground/85 transition hover:bg-background/80 sm:w-auto"
            >
              {t("openTaskLink")}
            </Link>
          ) : null}
          <Link
            href="/dashboard/business/analytics"
            className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/20 sm:w-auto"
          >
            {t("openAnalytics")}
          </Link>
        </div>
      </div>

      <BusinessCampaignEditor
        campaign={{
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          category: campaign.category,
          taskCategory: campaign.taskCategory,
          taskType: campaign.taskType,
          customTask: campaign.customTask,
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
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-foreground/60">{t("cards.campaignCategory")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {getCampaignCategoryLabel(campaign.category, undefined, settings.campaignCategoryOptions)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-foreground/60">{t("cards.taskCategory")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{campaign.taskCategory}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-foreground/60">{t("cards.taskType")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{effectiveTaskLabel}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-foreground/60">{t("cards.rewardPerTask")}</p>
            <p className="mt-2 text-lg font-semibold text-emerald-700 dark:text-emerald-200">
              INR {formatMoney(campaign.rewardPerTask)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("budget.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("budget.title")}</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.totalBudget")}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(campaign.totalBudget)}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.spentSoFar")}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">INR {formatMoney(spentBudget)}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.totalSlots")}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{totalSlots}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.usedSlots")}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{usedSlots}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                <span>{t("budget.deployment")}</span>
                <span>{deployment}%</span>
              </div>
              <div className="h-2 rounded-full bg-foreground/10">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${deployment}%` }} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.approved")}</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-200">{approvedCount}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.pending")}</p>
                <p className="mt-2 text-xl font-semibold text-amber-800 dark:text-amber-100">{pendingCount}</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("budget.rejected")}</p>
                <p className="mt-2 text-xl font-semibold text-rose-700 dark:text-rose-100">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("instructions.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("instructions.title")}</h3>
            </div>

            {campaign.tutorialVideoUrl ? (
              <CampaignTutorialVideo
                videoUrl={campaign.tutorialVideoUrl}
                eyebrow={t("video.eyebrow")}
                title={t("video.title")}
                body={t("video.body")}
                openLabel={t("video.openLabel")}
              />
            ) : null}

            {campaign.instructions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/60 p-4 text-sm text-foreground/50">
                {t("instructions.empty")}
              </div>
            ) : (
              <ol className="space-y-3">
                {campaign.instructions.map((instruction) => (
                  <li key={instruction.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/80 break-words">
                    <span className="mr-2 text-foreground/40">{instruction.sequence}.</span>
                    {instruction.instructionText}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/5 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">{t("timeline.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("timeline.title")}</h3>
          </div>

          {activityItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/60 p-4 text-sm text-foreground/50">
              {t("timeline.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {activityItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="break-words text-sm text-foreground/85">{item.label}</p>
                  <p className="mt-1 text-xs text-foreground/40">
                    {item.createdAt.toLocaleString(locale, {
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

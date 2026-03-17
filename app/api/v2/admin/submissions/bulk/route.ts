import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmissionCommissionRate } from "@/lib/commission";
import { getDailyResetState, getLevelFromApprovedCount } from "@/lib/level";
import { applyReferralRewardsOnFirstApproval } from "@/lib/referrals";
import { getAppSettings } from "@/lib/system-settings";

type BulkAction = "APPROVE" | "REJECT";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    submissionIds?: string[];
    action?: BulkAction;
    reason?: string;
  };
  const action = body.action;
  const reason = body.reason?.trim() || "";
  const submissionIds = Array.from(
    new Set((body.submissionIds || []).map((id) => id.trim()).filter(Boolean))
  );

  if (!action || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (submissionIds.length === 0) {
    return NextResponse.json({ error: "No submissions selected" }, { status: 400 });
  }
  if (submissionIds.length > 100) {
    return NextResponse.json({ error: "Select up to 100 submissions" }, { status: 400 });
  }

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const appSettings = await getAppSettings();

  for (const submissionId of submissionIds) {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          user: {
            select: { id: true, level: true, totalApproved: true },
          },
          campaign: {
            select: { id: true, title: true, category: true, rewardPerTask: true, remainingBudget: true },
          },
        },
      });

      if (!submission || !submission.campaign) {
        throw new Error("Submission/campaign missing");
      }
      if (submission.managerStatus !== "MANAGER_APPROVED" || submission.adminStatus !== "PENDING") {
        throw new Error("Submission not eligible");
      }

      if (action === "REJECT") {
        await prisma.$transaction(async (tx) => {
          await tx.submission.update({
            where: { id: submissionId },
            data: { adminStatus: "ADMIN_REJECTED" },
          });
          await tx.user.update({
            where: { id: submission.user.id },
            data: { totalRejected: { increment: 1 } },
          });
          const notification = await tx.notification.create({
            data: {
              userId: submission.user.id,
              title: "Submission rejected by admin",
              message: `Your submission did not pass final admin review.${reason ? ` Reason: ${reason}` : ""}`,
              type: "WARNING",
            },
          });
          await tx.notificationDeliveryLog.create({
            data: {
              userId: submission.user.id,
              notificationId: notification.id,
              templateKey: "submission.admin_rejected",
              channel: "IN_APP",
              status: "SENT",
              payload: { submissionId },
            },
          });
          await tx.activityLog.create({
            data: {
              userId: session.user.id,
              action: "ADMIN_BULK_REJECTED_SUBMISSION",
              entity: "Submission",
              details: `submissionId=${submissionId}, reason=${reason || "-"}`,
            },
          });
        });
      } else {
        const campaign = submission.campaign;
        const grossReward = campaign.rewardPerTask;

        await prisma.$transaction(async (tx) => {
          const freshCampaign = await tx.campaign.findUnique({
            where: { id: campaign.id },
            select: { remainingBudget: true },
          });
          const freshUser = await tx.user.findUnique({
            where: { id: submission.user.id },
            select: {
              level: true,
              totalApproved: true,
              dailyApproved: true,
              lastLevelResetAt: true,
            },
          });
          if (!freshCampaign || freshCampaign.remainingBudget < grossReward) {
            throw new Error("Insufficient campaign budget");
          }
          if (!freshUser) {
            throw new Error("User not found");
          }

          const commissionRate = getSubmissionCommissionRate({
            category: campaign.category,
            userLevel: freshUser.level,
            oneTimeRateOverride: appSettings.commissionRateDefault,
          });
          const freshCommission = Number((grossReward * commissionRate).toFixed(2));
          const freshNetReward = Number((grossReward - freshCommission).toFixed(2));

          await tx.campaign.update({
            where: { id: campaign.id },
            data: { remainingBudget: { decrement: grossReward } },
          });

          const { resetAt, resetNeeded } = getDailyResetState(freshUser.lastLevelResetAt);
          const currentDailyApproved = resetNeeded ? 0 : freshUser.dailyApproved;
          const nextDailyApproved = currentDailyApproved + 1;
          const nextLevel = getLevelFromApprovedCount(nextDailyApproved);
          await tx.user.update({
            where: { id: submission.user.id },
            data: {
              balance: { increment: freshNetReward },
              dailyApproved: nextDailyApproved,
              totalApproved: { increment: 1 },
              level: nextLevel,
              lastLevelResetAt: resetNeeded ? resetAt : freshUser.lastLevelResetAt,
            },
          });

          await tx.walletTransaction.create({
            data: {
              userId: submission.user.id,
              amount: freshNetReward,
              type: "CREDIT",
              note: `Campaign reward (${campaign.title})`,
            },
          });

          await tx.platformEarning.create({
            data: {
              amount: freshCommission,
              source: `Campaign commission - ${campaign.title}`,
            },
          });

          await tx.platformTreasury.upsert({
            where: { id: "main" },
            update: { balance: { increment: freshCommission } },
            create: { id: "main", balance: freshCommission },
          });

          await tx.submission.update({
            where: { id: submissionId },
            data: { adminStatus: "ADMIN_APPROVED", status: "APPROVED", rewardAmount: freshNetReward },
          });

          if (freshUser.totalApproved === 0) {
            await applyReferralRewardsOnFirstApproval(tx, {
              referredUserId: submission.user.id,
              campaignTitle: campaign.title,
            });
          }

          const notification = await tx.notification.create({
            data: {
              userId: submission.user.id,
              title: "Submission approved by admin",
              message: `Final approval complete. INR ${freshNetReward} credited to your wallet.`,
              type: "SUCCESS",
            },
          });
          await tx.notificationDeliveryLog.create({
            data: {
              userId: submission.user.id,
              notificationId: notification.id,
              templateKey: "submission.admin_approved",
              channel: "IN_APP",
              status: "SENT",
              payload: { submissionId, netReward: freshNetReward },
            },
          });

          await tx.activityLog.create({
            data: {
              userId: session.user.id,
              action: "ADMIN_BULK_APPROVED_SUBMISSION",
              entity: "Submission",
              details: `submissionId=${submissionId}, gross=${grossReward}, commission=${freshCommission}, net=${freshNetReward}`,
            },
          });
        });
      }

      updated += 1;
    } catch (error: unknown) {
      failed += 1;
      errors.push(
        `${submissionId}: ${error instanceof Error ? error.message : "Failed"}`
      );
    }
  }

  return NextResponse.json({
    message: "Bulk moderation completed",
    updated,
    failed,
    errors,
  });
}

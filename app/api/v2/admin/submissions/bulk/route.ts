import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmissionCommissionRate } from "@/lib/commission";
import { getLevelFromApprovedCount } from "@/lib/level";
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
        const commissionRate = getSubmissionCommissionRate({
          category: submission.campaign.category,
          userLevel: submission.user.level,
          oneTimeRateOverride: appSettings.commissionRateDefault,
        });
        const grossReward = submission.campaign.rewardPerTask;
        const commission = Number((grossReward * commissionRate).toFixed(2));
        const netReward = Number((grossReward - commission).toFixed(2));

        await prisma.$transaction(async (tx) => {
          const freshCampaign = await tx.campaign.findUnique({
            where: { id: submission.campaign!.id },
            select: { remainingBudget: true },
          });
          if (!freshCampaign || freshCampaign.remainingBudget < grossReward) {
            throw new Error("Insufficient campaign budget");
          }

          await tx.campaign.update({
            where: { id: submission.campaign!.id },
            data: { remainingBudget: { decrement: grossReward } },
          });

          const nextApprovedCount = submission.user.totalApproved + 1;
          const nextLevel = getLevelFromApprovedCount(nextApprovedCount);
          await tx.user.update({
            where: { id: submission.user.id },
            data: {
              balance: { increment: netReward },
              totalApproved: { increment: 1 },
              level: nextLevel,
            },
          });

          await tx.walletTransaction.create({
            data: {
              userId: submission.user.id,
              amount: netReward,
              type: "CREDIT",
              note: `Campaign reward (${submission.campaign!.title})`,
            },
          });

          await tx.platformEarning.create({
            data: {
              amount: commission,
              source: `Campaign commission - ${submission.campaign!.title}`,
            },
          });

          await tx.platformTreasury.upsert({
            where: { id: "main" },
            update: { balance: { increment: commission } },
            create: { id: "main", balance: commission },
          });

          await tx.submission.update({
            where: { id: submissionId },
            data: { adminStatus: "ADMIN_APPROVED", status: "APPROVED", rewardAmount: netReward },
          });

          if (submission.user.totalApproved === 0) {
            await applyReferralRewardsOnFirstApproval(tx, {
              referredUserId: submission.user.id,
              campaignTitle: submission.campaign!.title,
            });
          }

          const notification = await tx.notification.create({
            data: {
              userId: submission.user.id,
              title: "Submission approved by admin",
              message: `Final approval complete. INR ${netReward} credited to your wallet.`,
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
              payload: { submissionId, netReward },
            },
          });

          await tx.activityLog.create({
            data: {
              userId: session.user.id,
              action: "ADMIN_BULK_APPROVED_SUBMISSION",
              entity: "Submission",
              details: `submissionId=${submissionId}, gross=${grossReward}, commission=${commission}, net=${netReward}`,
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

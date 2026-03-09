import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmissionCommissionRate } from "@/lib/commission";
import { getLevelFromApprovedCount } from "@/lib/level";
import { getAppSettings } from "@/lib/system-settings";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { submissionId } = await params;
  const appSettings = await getAppSettings();
  const { action, reason } = (await req.json()) as {
    action?: "APPROVE" | "REJECT" | "REOPEN";
    reason?: string;
  };
  const reviewReason = reason?.trim() || "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      user: {
        select: {
          id: true,
          level: true,
          totalApproved: true,
          totalRejected: true,
        },
      },
      campaign: {
        select: {
          id: true,
          category: true,
          rewardPerTask: true,
          remainingBudget: true,
          title: true,
        },
      },
    },
  });

  if (!submission || !submission.campaign) {
    return NextResponse.json({ error: "Submission or campaign not found" }, { status: 404 });
  }

  if (submission.managerStatus !== "MANAGER_APPROVED") {
    return NextResponse.json(
      { error: "Manager approval is required before admin verification" },
      { status: 400 }
    );
  }

  if (action !== "REOPEN" && submission.adminStatus !== "PENDING") {
    return NextResponse.json({ error: "Admin already reviewed this submission" }, { status: 400 });
  }

  if (action === "REOPEN") {
    if (!reviewReason) {
      return NextResponse.json({ error: "Reopen reason is required" }, { status: 400 });
    }
    if (!["ADMIN_APPROVED", "ADMIN_REJECTED"].includes(submission.adminStatus)) {
      return NextResponse.json({ error: "Only reviewed submissions can be reopened" }, { status: 400 });
    }

    if (submission.adminStatus === "ADMIN_REJECTED") {
      const reopened = await prisma.$transaction(async (tx) => {
        const updated = await tx.submission.update({
          where: { id: submissionId },
          data: {
            adminStatus: "PENDING",
            status: "PENDING",
          },
        });

        await tx.user.update({
          where: { id: submission.user.id },
          data: { totalRejected: { decrement: submission.user.totalRejected > 0 ? 1 : 0 } },
        });

        const notification = await tx.notification.create({
          data: {
            userId: submission.user.id,
            title: "Submission reopened",
            message: `Your submission was reopened for final admin re-verification. Reason: ${reviewReason}`,
            type: "INFO",
          },
        });
        await tx.notificationDeliveryLog.create({
          data: {
            userId: submission.user.id,
            notificationId: notification.id,
            templateKey: "submission.reopened",
            channel: "IN_APP",
            status: "SENT",
            payload: { submissionId, mode: "REOPEN_FROM_REJECTED" },
          },
        });

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ADMIN_REOPENED_SUBMISSION",
            entity: "Submission",
            details: `submissionId=${submissionId}, previous=ADMIN_REJECTED, reason=${reviewReason}`,
          },
        });

        return updated;
      });

      return NextResponse.json({ message: "Submission reopened", submission: reopened });
    }

    const netReward = submission.rewardAmount || 0;
    const grossReward = submission.campaign.rewardPerTask;
    const commission = Number((grossReward - netReward).toFixed(2));

    const reopened = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: submission.user.id },
        select: { balance: true, totalApproved: true },
      });

      if (!freshUser || freshUser.balance < netReward) {
        throw new Error("User balance is insufficient to reverse this approval");
      }

      const treasury = await tx.platformTreasury.upsert({
        where: { id: "main" },
        update: {},
        create: { id: "main", balance: 0 },
      });

      if (commission > 0 && treasury.balance < commission) {
        throw new Error("Treasury balance is insufficient to reverse commission");
      }

      await tx.campaign.update({
        where: { id: submission.campaign!.id },
        data: {
          remainingBudget: { increment: grossReward },
        },
      });

      const nextApprovedCount = Math.max(0, freshUser.totalApproved - 1);
      const nextLevel = getLevelFromApprovedCount(nextApprovedCount);

      await tx.user.update({
        where: { id: submission.user.id },
        data: {
          balance: { decrement: netReward },
          totalApproved: { decrement: 1 },
          level: nextLevel,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: submission.user.id,
          amount: netReward,
          type: "DEBIT",
          note: `Admin reopen reversal (${submission.campaign!.title})`,
        },
      });

      if (commission > 0) {
        await tx.platformEarning.create({
          data: {
            amount: -commission,
            source: `Reversal - ${submission.campaign!.title}`,
          },
        });

        await tx.platformTreasury.update({
          where: { id: "main" },
          data: {
            balance: { decrement: commission },
          },
        });
      }

      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: {
          adminStatus: "PENDING",
          status: "PENDING",
          rewardAmount: 0,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: submission.user.id,
          title: "Submission reopened",
          message: `A previously approved submission was reopened for final admin re-verification. Reason: ${reviewReason}`,
          type: "WARNING",
        },
      });
      await tx.notificationDeliveryLog.create({
        data: {
          userId: submission.user.id,
          notificationId: notification.id,
          templateKey: "submission.reopened",
          channel: "IN_APP",
          status: "SENT",
          payload: { submissionId, mode: "REOPEN_FROM_APPROVED" },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_REOPENED_SUBMISSION",
          entity: "Submission",
          details: `submissionId=${submissionId}, previous=ADMIN_APPROVED, net=${netReward}, commission=${commission}, reason=${reviewReason}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ message: "Submission reopened", submission: reopened });
  }

  if (action === "REJECT") {
    const rejected = await prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
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
          message: `Your submission did not pass final admin review.${reviewReason ? ` Reason: ${reviewReason}` : ""}`,
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
          action: "ADMIN_REJECTED_SUBMISSION",
          entity: "Submission",
          details: `submissionId=${submissionId}, reason=${reviewReason || "-"}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ message: "Submission rejected", submission: rejected });
  }

  const commissionRate = getSubmissionCommissionRate({
    category: submission.campaign.category,
    userLevel: submission.user.level,
    oneTimeRateOverride: appSettings.commissionRateDefault,
  });

  const grossReward = submission.campaign.rewardPerTask;
  const commission = Number((grossReward * commissionRate).toFixed(2));
  const netReward = Number((grossReward - commission).toFixed(2));

  const approved = await prisma.$transaction(async (tx) => {
    if (submission.campaign!.remainingBudget < grossReward) {
      throw new Error("Insufficient campaign budget");
    }

    await tx.campaign.update({
      where: { id: submission.campaign!.id },
      data: {
        remainingBudget: {
          decrement: grossReward,
        },
      },
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

    const updatedSubmission = await tx.submission.update({
      where: { id: submissionId },
      data: {
        adminStatus: "ADMIN_APPROVED",
        status: "APPROVED",
        rewardAmount: netReward,
      },
    });

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
        action: "ADMIN_APPROVED_SUBMISSION",
        entity: "Submission",
        details: `submissionId=${submissionId}, gross=${grossReward}, commission=${commission}, net=${netReward}`,
      },
    });

    return updatedSubmission;
  });

  return NextResponse.json({ message: "Submission approved", submission: approved });
}

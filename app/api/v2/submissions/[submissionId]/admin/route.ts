import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmissionCommissionRate } from "@/lib/commission";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { submissionId } = await params;
  const { action } = (await req.json()) as { action?: "APPROVE" | "REJECT" };

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

  if (submission.adminStatus !== "PENDING") {
    return NextResponse.json({ error: "Admin already reviewed this submission" }, { status: 400 });
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

      await tx.notification.create({
        data: {
          userId: submission.user.id,
          title: "Submission rejected by admin",
          message: "Your submission did not pass final admin review.",
          type: "WARNING",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_REJECTED_SUBMISSION",
          entity: "Submission",
          details: `submissionId=${submissionId}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ message: "Submission rejected", submission: rejected });
  }

  const commissionRate = getSubmissionCommissionRate({
    category: submission.campaign.category,
    userLevel: submission.user.level,
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

    await tx.user.update({
      where: { id: submission.user.id },
      data: {
        balance: { increment: netReward },
        totalApproved: { increment: 1 },
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

    await tx.notification.create({
      data: {
        userId: submission.user.id,
        title: "Submission approved by admin",
        message: `Final approval complete. INR ${netReward} credited to your wallet.`,
        type: "SUCCESS",
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

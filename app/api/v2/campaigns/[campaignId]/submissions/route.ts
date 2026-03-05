import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelFromDailySubmits, shouldResetLevel } from "@/lib/level";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const { proofLink, proofText } = (await req.json()) as {
    proofLink?: string;
    proofText?: string;
  };

  if (!proofLink && !proofText) {
    return NextResponse.json({ error: "Proof link or text is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      rewardPerTask: true,
      remainingBudget: true,
    },
  });

  if (!campaign || campaign.status !== "LIVE") {
    return NextResponse.json({ error: "Campaign is not live" }, { status: 400 });
  }

  if (campaign.remainingBudget < campaign.rewardPerTask) {
    return NextResponse.json({ error: "Campaign budget exhausted" }, { status: 400 });
  }

  const existing = await prisma.submission.findFirst({
    where: {
      userId: session.user.id,
      campaignId,
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      select: { dailySubmits: true, level: true, lastLevelResetAt: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const resetNeeded = shouldResetLevel(user.lastLevelResetAt);
    const currentSubmits = resetNeeded ? 0 : user.dailySubmits;
    const nextSubmits = currentSubmits + 1;
    const nextLevel = getLevelFromDailySubmits(nextSubmits);

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        dailySubmits: nextSubmits,
        level: nextLevel,
        lastLevelResetAt: resetNeeded ? new Date() : user.lastLevelResetAt,
      },
    });

    const submission = await tx.submission.create({
      data: {
        userId: session.user.id,
        campaignId,
        proof: proofText || proofLink || "",
        proofLink,
        proofText,
        managerStatus: "PENDING",
        adminStatus: "PENDING",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SUBMISSION_CREATED",
        entity: "Submission",
        details: `submissionId=${submission.id}, campaignId=${campaignId}`,
      },
    });

    return submission;
  });

  return NextResponse.json({ message: "Submission created", submission: result }, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyResetState } from "@/lib/level";
import { getClientIp } from "@/lib/ip";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";
import { autoFlagSuspiciousUser } from "@/lib/safety";
import { getCampaignRepeatAccess, getIndiaDateKey } from "@/lib/campaign-repeat";

function stableIndex(input: string, length: number) {
  if (length <= 0) return 0;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      taskCategory: true,
      taskType: true,
      customTask: true,
      taskLink: true,
      tutorialVideoUrl: true,
      rewardPerTask: true,
      totalBudget: true,
      remainingBudget: true,
      submissionMode: true,
      repeatAccessMode: true,
      status: true,
      instructions: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          instructionText: true,
          sequence: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.category.toLowerCase() === "work") {
    const assigned = await prisma.campaignAssignment.findUnique({
      where: { campaignId_userId: { campaignId, userId: session.user.id } },
      select: { id: true },
    });

    if (!assigned) {
      return NextResponse.json({ error: "This campaign is invite-only." }, { status: 403 });
    }
  }

  const allowedSubmissions = Math.max(1, Math.floor(campaign.totalBudget / campaign.rewardPerTask));
  const todayKey = getIndiaDateKey();
  const [occupiedSubmissions, userSubmissionCount, repeatRequest] = await Promise.all([
    prisma.submission.count({
      where: {
        campaignId,
        NOT: [
          { managerStatus: "MANAGER_REJECTED" },
          { adminStatus: "ADMIN_REJECTED" },
          { status: "REJECTED" },
        ],
      },
    }),
    prisma.submission.count({
      where: {
        campaignId,
        userId: session.user.id,
      },
    }),
    prisma.campaignRepeatRequest.findFirst({
      where: {
        campaignId,
        userId: session.user.id,
        requestDateKey: todayKey,
      },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const leftSubmissions = Math.max(0, allowedSubmissions - occupiedSubmissions);
  const blockedBySubmissionMode =
    campaign.submissionMode === "ONE_PER_USER" && userSubmissionCount > 0;
  const repeatAccess = getCampaignRepeatAccess({
    submissionMode: campaign.submissionMode,
    repeatAccessMode: campaign.repeatAccessMode,
    userSubmissionCount,
    repeatRequestStatus: repeatRequest?.status ?? null,
  });
  const isAvailable =
    campaign.status === "LIVE" &&
    campaign.remainingBudget >= campaign.rewardPerTask &&
    leftSubmissions > 0 &&
    !blockedBySubmissionMode &&
    !repeatAccess.blockedByRepeatRule;
  const remainingInstructions = campaign.instructions.slice(occupiedSubmissions);
  const instructionPool =
    remainingInstructions.length > 0 ? remainingInstructions : campaign.instructions;
  const currentInstruction =
    isAvailable && instructionPool.length > 0
      ? instructionPool[
          stableIndex(
            `${session.user.id}:${campaignId}:${occupiedSubmissions}:${userSubmissionCount}`,
            instructionPool.length
          )
        ]
      : null;

  return NextResponse.json({
    campaign: {
      ...campaign,
      allowedSubmissions,
      usedSubmissions: occupiedSubmissions,
      leftSubmissions,
      userSubmissionCount,
      submissionMode: campaign.submissionMode,
      blockedBySubmissionMode: blockedBySubmissionMode || repeatAccess.blockedByRepeatRule,
      blockedByRepeatRule: repeatAccess.blockedByRepeatRule,
      repeatAccessMode: campaign.repeatAccessMode,
      repeatRequestStatus: repeatRequest?.status ?? null,
      canRequestTomorrow: campaign.status === "LIVE" && repeatAccess.canRequestTomorrow,
      repeatRequestReason: repeatAccess.reason,
      isAvailable,
      currentInstruction,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const ip = getClientIp(req);
  const ipAccess = await checkIpAccess({ ip });
  if (ipAccess.blocked) {
    await createSecurityEvent({
      kind: "SUBMISSION_BLOCKED_IP",
      severity: "HIGH",
      ipAddress: ip,
      message: "Submission attempt blocked by IP access rule",
      metadata: { reason: ipAccess.reason },
    });
    return NextResponse.json({ error: "Access denied from this network" }, { status: 403 });
  }

  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const { proofLink, proofText, proofImage } = (await req.json()) as {
    proofLink?: string;
    proofText?: string;
    proofImage?: string;
  };

  const normalizedProofLink = typeof proofLink === "string" ? proofLink.trim() : "";
  const normalizedProofText = typeof proofText === "string" ? proofText.trim() : "";
  const normalizedProofImage = typeof proofImage === "string" ? proofImage.trim() : "";

  if (!normalizedProofLink && !normalizedProofText && !normalizedProofImage) {
    return NextResponse.json(
      { error: "Proof link, text, or screenshot is required" },
      { status: 400 }
    );
  }

  // Very basic sanity check: only accept https urls for stored proof images.
  if (normalizedProofImage && !/^https:\/\/.+/i.test(normalizedProofImage)) {
    return NextResponse.json({ error: "Invalid proof image URL" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      category: true,
      rewardPerTask: true,
      totalBudget: true,
      remainingBudget: true,
      submissionMode: true,
      repeatAccessMode: true,
    },
  });

  if (!campaign || campaign.status !== "LIVE") {
    return NextResponse.json({ error: "Campaign is not live" }, { status: 400 });
  }

  if (campaign.category.toLowerCase() === "work") {
    const assigned = await prisma.campaignAssignment.findUnique({
      where: { campaignId_userId: { campaignId, userId: session.user.id } },
      select: { id: true },
    });

    if (!assigned) {
      return NextResponse.json({ error: "This campaign is invite-only." }, { status: 403 });
    }
  }

  if (campaign.remainingBudget < campaign.rewardPerTask) {
    return NextResponse.json({ error: "Campaign budget exhausted" }, { status: 400 });
  }

  const maxCampaignSubmissions = Math.max(
    1,
    Math.floor(campaign.totalBudget / campaign.rewardPerTask)
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { dailySubmits: true, dailyApproved: true, lastLevelResetAt: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const { resetAt, resetNeeded } = getDailyResetState(user.lastLevelResetAt);
      const currentSubmits = resetNeeded ? 0 : user.dailySubmits;
      const nextSubmits = currentSubmits + 1;

      const occupiedSubmissionCount = await tx.submission.count({
        where: {
          campaignId,
          NOT: [
            { managerStatus: "MANAGER_REJECTED" },
            { adminStatus: "ADMIN_REJECTED" },
            { status: "REJECTED" },
          ],
        },
      });
      const existingUserSubmissionCount = await tx.submission.count({
        where: {
          campaignId,
          userId: session.user.id,
        },
      });

      if (campaign.submissionMode === "ONE_PER_USER") {
        if (existingUserSubmissionCount > 0) {
          throw new Error("This campaign allows only one submission per user.");
        }
      }

      const repeatRequest = await tx.campaignRepeatRequest.findFirst({
        where: {
          campaignId,
          userId: session.user.id,
          requestDateKey: getIndiaDateKey(),
        },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });

      const repeatAccess = getCampaignRepeatAccess({
        submissionMode: campaign.submissionMode,
        repeatAccessMode: campaign.repeatAccessMode,
        userSubmissionCount: existingUserSubmissionCount,
        repeatRequestStatus: repeatRequest?.status ?? null,
      });

      if (repeatAccess.blockedByRepeatRule) {
        throw new Error(
          repeatAccess.reason === "requested_users_only"
            ? "This campaign is currently running only for approved requested users."
            : "Request tomorrow access from the task page before submitting again."
        );
      }

      if (occupiedSubmissionCount >= maxCampaignSubmissions) {
        throw new Error("Campaign submission capacity is full. Try again later.");
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          dailySubmits: nextSubmits,
          ...(resetNeeded
            ? {
                dailyApproved: 0,
                level: "L1",
                lastLevelResetAt: resetAt,
              }
            : {
                lastLevelResetAt: user.lastLevelResetAt,
              }),
        },
      });

      const submission = await tx.submission.create({
        data: {
          userId: session.user.id,
          campaignId,
          proof: normalizedProofText || normalizedProofLink || normalizedProofImage || "",
          proofLink: normalizedProofLink || null,
          proofText: normalizedProofText || null,
          proofImage: normalizedProofImage || null,
          ipAddress: ip !== "unknown" ? ip : null,
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

    if (ip !== "unknown") {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentIpSubmissions = await prisma.submission.findMany({
        where: {
          ipAddress: ip,
          createdAt: { gte: last24h },
        },
        select: { userId: true },
      });

      const uniqueUsers = new Set(recentIpSubmissions.map((row) => row.userId)).size;
      if (uniqueUsers >= 8) {
        await autoFlagSuspiciousUser({
          userId: session.user.id,
          reason: `IP anomaly: ${uniqueUsers} distinct users submitted from IP ${ip} in 24h`,
        });
        await createSecurityEvent({
          kind: "IP_SUBMISSION_ANOMALY",
          severity: "HIGH",
          ipAddress: ip,
          userId: session.user.id,
          message: "High multi-account submission activity from same IP",
          metadata: { uniqueUsers, windowHours: 24 },
        });
      }
    }

    return NextResponse.json({ message: "Submission created", submission: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed";
    const status = message.includes("capacity is full") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

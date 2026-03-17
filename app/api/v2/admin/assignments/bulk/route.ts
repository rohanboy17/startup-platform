import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Body = {
  campaignId?: unknown;
  skillSlug?: unknown;
  dryRun?: unknown;
  excludeSuspicious?: unknown;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId.trim() : "";
  const skillSlug = typeof body?.skillSlug === "string" ? body.skillSlug.trim() : "";
  const dryRun = body?.dryRun === true;
  const excludeSuspicious = body?.excludeSuspicious !== false;

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (!skillSlug) {
    return NextResponse.json({ error: "skillSlug is required" }, { status: 400 });
  }

  const [campaign, skill] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true, category: true, status: true },
    }),
    prisma.skill.findUnique({
      where: { slug: skillSlug },
      select: { id: true, slug: true, label: true },
    }),
  ]);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.category.toLowerCase() !== "work") {
    return NextResponse.json({ error: "Only work-based campaigns can be bulk assigned." }, { status: 400 });
  }

  if (!["PENDING", "APPROVED", "LIVE"].includes(campaign.status)) {
    return NextResponse.json({ error: "Campaign is not assignable in its current status." }, { status: 400 });
  }

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const userSkillRows = await prisma.userSkill.findMany({
    where: {
      skillId: skill.id,
      user: {
        role: "USER",
        accountStatus: "ACTIVE",
        deletedAt: null,
        ...(excludeSuspicious ? { isSuspicious: false } : {}),
      },
    },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
    take: 20000,
  });

  const eligibleUserIds = Array.from(new Set(userSkillRows.map((r) => r.userId)));
  if (eligibleUserIds.length === 0) {
    return NextResponse.json({
      message: "No eligible users found for this skill",
      campaignId,
      skill: { slug: skill.slug, label: skill.label },
      eligible: 0,
      alreadyAssigned: 0,
      newlyAssigned: 0,
    });
  }

  const existing = await prisma.campaignAssignment.findMany({
    where: { campaignId, userId: { in: eligibleUserIds } },
    select: { userId: true },
    take: 20000,
  });

  const assignedSet = new Set(existing.map((r) => r.userId));
  const missingUserIds = eligibleUserIds.filter((id) => !assignedSet.has(id));

  if (dryRun) {
    return NextResponse.json({
      message: "Dry run preview (no changes applied)",
      campaignId,
      skill: { slug: skill.slug, label: skill.label },
      filters: { excludeSuspicious },
      eligible: eligibleUserIds.length,
      alreadyAssigned: assignedSet.size,
      wouldAssign: missingUserIds.length,
      sampleUserIds: missingUserIds.slice(0, 20),
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    const batchSize = 500;
    for (let i = 0; i < missingUserIds.length; i += batchSize) {
      const batch = missingUserIds.slice(i, i + batchSize);
      const createRes = await tx.campaignAssignment.createMany({
        data: batch.map((userId) => ({
          campaignId,
          userId,
          assignedByUserId: session.user.id,
        })),
        skipDuplicates: true,
      });
      created += createRes.count;
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_BULK_ASSIGN_USERS_BY_SKILL",
        entity: "CampaignAssignment",
        details: `campaignId=${campaignId}, skill=${skill.slug}, excludeSuspicious=${excludeSuspicious}, eligible=${eligibleUserIds.length}, missing=${missingUserIds.length}, created=${created}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        action: "ADMIN_BULK_ASSIGN_USERS_BY_SKILL",
        details: `campaignId=${campaignId}, title=${campaign.title}, skill=${skill.slug}, excludeSuspicious=${excludeSuspicious}, eligible=${eligibleUserIds.length}, missing=${missingUserIds.length}, created=${created}`,
      },
    });

    return { created };
  });

  return NextResponse.json({
    message: "Bulk assignment complete",
    campaignId,
    skill: { slug: skill.slug, label: skill.label },
    filters: { excludeSuspicious },
    eligible: eligibleUserIds.length,
    alreadyAssigned: assignedSet.size,
    wouldAssign: missingUserIds.length,
    newlyAssigned: result.created,
  });
}

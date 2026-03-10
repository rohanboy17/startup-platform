import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageBusinessSettings,
  getBusinessContext,
  type ResolvedBusinessAccessRole,
} from "@/lib/business-context";

const TEAM_ROLES: ResolvedBusinessAccessRole[] = ["EDITOR", "VIEWER"];

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const [owner, members] = await Promise.all([
    prisma.user.findUnique({
      where: { id: context.businessUserId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        businessOwnerId: context.businessUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessAccessRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    actorRole: context.accessRole,
    owner,
    members: members.map((member) => ({
      ...member,
      accessRole: member.businessAccessRole || "VIEWER",
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessSettings(context.accessRole)) {
    return NextResponse.json({ error: "Only the business owner can manage team members" }, { status: 403 });
  }

  const body = (await req.json()) as { email?: string; accessRole?: ResolvedBusinessAccessRole };
  const email = body.email?.trim().toLowerCase() || "";
  const accessRole = body.accessRole;

  if (!email || !accessRole || !TEAM_ROLES.includes(accessRole)) {
    return NextResponse.json({ error: "Valid email and team role are required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      businessOwnerId: true,
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  if (!target || target.role !== "BUSINESS") {
    return NextResponse.json({ error: "Only existing business accounts can be added to the team" }, { status: 400 });
  }

  if (target.id === context.businessUserId) {
    return NextResponse.json({ error: "The owner account is already the primary business account" }, { status: 400 });
  }

  if (target.businessOwnerId && target.businessOwnerId !== context.businessUserId) {
    return NextResponse.json({ error: "This account already belongs to another business team" }, { status: 400 });
  }

  if (!target.businessOwnerId && target._count.campaigns > 0) {
    return NextResponse.json(
      { error: "This business account already owns campaigns and cannot be converted to a team member" },
      { status: 400 }
    );
  }

  const member = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: target.id },
      data: {
        businessOwnerId: context.businessUserId,
        businessAccessRole: accessRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessAccessRole: true,
        createdAt: true,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_ADDED_TEAM_MEMBER",
        entity: "BusinessTeam",
        details: `businessId=${context.businessUserId}, memberId=${target.id}, accessRole=${accessRole}`,
      },
    });

    return updated;
  });

  return NextResponse.json({ message: "Team member added", member });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessSettings(context.accessRole)) {
    return NextResponse.json({ error: "Only the business owner can manage team members" }, { status: 403 });
  }

  const body = (await req.json()) as {
    memberId?: string;
    accessRole?: ResolvedBusinessAccessRole;
  };

  if (!body.memberId || !body.accessRole || !TEAM_ROLES.includes(body.accessRole)) {
    return NextResponse.json({ error: "Valid member and role are required" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: {
      id: body.memberId,
      businessOwnerId: context.businessUserId,
    },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.id },
      data: {
        businessAccessRole: body.accessRole,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_UPDATED_TEAM_MEMBER",
        entity: "BusinessTeam",
        details: `businessId=${context.businessUserId}, memberId=${member.id}, accessRole=${body.accessRole}`,
      },
    });
  });

  return NextResponse.json({ message: "Team role updated" });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessSettings(context.accessRole)) {
    return NextResponse.json({ error: "Only the business owner can manage team members" }, { status: 403 });
  }

  const body = (await req.json()) as { memberId?: string };
  if (!body.memberId) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: {
      id: body.memberId,
      businessOwnerId: context.businessUserId,
    },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.id },
      data: {
        businessOwnerId: null,
        businessAccessRole: null,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_REMOVED_TEAM_MEMBER",
        entity: "BusinessTeam",
        details: `businessId=${context.businessUserId}, memberId=${member.id}`,
      },
    });
  });

  return NextResponse.json({ message: "Team member removed" });
}

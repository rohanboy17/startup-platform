import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fallbackDisplayName(input: { name?: string | null; email?: string | null }) {
  const name = input.name?.trim();
  if (name) return name;
  const emailName = input.email?.split("@")[0]?.trim();
  return emailName || "FreeEarnHub member";
}

function roleLabel(role: string) {
  return role === "BUSINESS" ? "Business owner" : "Verified user";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user.id || !["USER", "BUSINESS"].includes(session.user.role)) {
    return NextResponse.json({ error: "Please sign in with a user or business account." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    quote?: string;
    displayName?: string;
  };

  const quote = body.quote?.trim() || "";
  const displayName = body.displayName?.trim() || fallbackDisplayName({
    name: session.user.name,
    email: session.user.email,
  });

  if (quote.length < 24) {
    return NextResponse.json(
      { error: "Please write at least a short sentence so the feedback is useful." },
      { status: 400 }
    );
  }

  if (quote.length > 280) {
    return NextResponse.json(
      { error: "Please keep feedback within 280 characters." },
      { status: 400 }
    );
  }

  const pendingExisting = await prisma.communityFeedback.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });

  if (pendingExisting) {
    return NextResponse.json(
      { error: "Your feedback is under review." },
      { status: 409 }
    );
  }

  const created = await prisma.communityFeedback.create({
    data: {
      userId: session.user.id,
      displayName,
      roleLabel: roleLabel(session.user.role),
      quote,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", accountStatus: "ACTIVE", deletedAt: null },
    select: { id: true },
    take: 100,
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "New community feedback",
        message: `${displayName} submitted feedback for homepage review.`,
        type: "INFO",
      })),
      skipDuplicates: false,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "COMMUNITY_FEEDBACK_SUBMITTED",
      details: `feedbackId=${created.id}`,
    },
  });

  return NextResponse.json({
    message: "Your feedback is under review.",
    item: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}

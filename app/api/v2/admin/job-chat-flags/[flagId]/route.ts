import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { flagId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { action?: "REVIEW" | "DISMISS"; adminNote?: string }
    | null;

  const action = body?.action;
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim().slice(0, 800) : "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const flag = await prisma.jobApplicationChatFlag.findUnique({
    where: { id: flagId },
    select: { id: true },
  });

  if (!flag) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobApplicationChatFlag.update({
      where: { id: flagId },
      data: {
        status: action === "REVIEW" ? "REVIEWED" : "DISMISSED",
        adminNote: adminNote || null,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: action === "REVIEW" ? "ADMIN_REVIEWED_JOB_CHAT_FLAG" : "ADMIN_DISMISSED_JOB_CHAT_FLAG",
        entity: "JobApplicationChatFlag",
        details: `flagId=${flagId}`,
      },
    });
  });

  return NextResponse.json({
    message: action === "REVIEW" ? "Chat flag reviewed" : "Chat flag dismissed",
  });
}

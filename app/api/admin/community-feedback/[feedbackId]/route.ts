import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { feedbackId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    adminNote?: string;
  };
  const status = body.status;

  if (!feedbackId || !status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "A valid feedback id and status are required." }, { status: 400 });
  }

  const item = await prisma.communityFeedback.update({
    where: { id: feedbackId },
    data: {
      status,
      adminNote: body.adminNote?.trim() || null,
      reviewedAt: status === "PENDING" ? null : new Date(),
      reviewedByUserId: status === "PENDING" ? null : session.user.id,
    },
    select: {
      id: true,
      status: true,
      userId: true,
      displayName: true,
      quote: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: item.userId,
      action: `COMMUNITY_FEEDBACK_${status}`,
      details: `feedbackId=${item.id}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: item.userId,
      title: status === "APPROVED" ? "Feedback approved" : status === "REJECTED" ? "Feedback not approved" : "Feedback review updated",
      message:
        status === "APPROVED"
          ? "Your community feedback was approved and can now appear on the homepage."
          : status === "REJECTED"
            ? "Your feedback was reviewed but was not approved for public display."
            : "Your feedback was moved back to pending review.",
      type: status === "REJECTED" ? "WARNING" : "SUCCESS",
    },
  });

  return NextResponse.json({
    message:
      status === "APPROVED"
        ? "Feedback approved"
        : status === "REJECTED"
          ? "Feedback rejected"
          : "Feedback moved back to pending",
    item,
  });
}

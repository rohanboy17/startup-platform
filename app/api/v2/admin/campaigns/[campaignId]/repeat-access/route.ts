import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    repeatAccessMode?: "OPEN" | "REQUESTED_ONLY" | "REQUESTED_PLUS_NEW";
  };
  const repeatAccessMode = body.repeatAccessMode;

  if (!repeatAccessMode || !["OPEN", "REQUESTED_ONLY", "REQUESTED_PLUS_NEW"].includes(repeatAccessMode)) {
    return NextResponse.json({ error: "A valid repeat access mode is required." }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      submissionMode: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.submissionMode !== "MULTIPLE_PER_USER") {
    return NextResponse.json(
      { error: "Repeat access rules apply only to many-submission campaigns." },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.campaign.update({
      where: { id: campaignId },
      data: { repeatAccessMode },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_UPDATE_REPEAT_ACCESS_MODE",
        entity: "Campaign",
        details: `campaignId=${campaignId}, repeatAccessMode=${repeatAccessMode}`,
      },
    });

    return next;
  });

  return NextResponse.json({ message: "Repeat participation rule updated.", campaign: updated });
}

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
  const { action } = (await req.json()) as {
    action?: "APPROVE" | "REJECT" | "LIVE" | "COMPLETE";
  };

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true, businessId: true, title: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const nextStatusByAction = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    LIVE: "LIVE",
    COMPLETE: "COMPLETED",
  } as const;

  const status = nextStatusByAction[action];

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: { status },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: `ADMIN_${action}_CAMPAIGN`,
        entity: "Campaign",
        details: `campaignId=${campaignId}, from=${campaign.status}, to=${status}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: campaign.businessId,
        title: `Campaign ${status.toLowerCase()}`,
        message: `Your campaign "${campaign.title}" is now ${status}.`,
        type: action === "REJECT" ? "WARNING" : "INFO",
      },
    });

    return updatedCampaign;
  });

  return NextResponse.json({ message: `Campaign ${status.toLowerCase()}`, campaign: updated });
}

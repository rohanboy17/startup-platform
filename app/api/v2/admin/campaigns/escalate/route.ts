import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const pendingBreached = await tx.campaign.findMany({
      where: {
        status: "PENDING",
        escalatedAt: null,
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        businessId: true,
        title: true,
      },
      take: 500,
    });

    if (pendingBreached.length === 0) {
      return { escalated: 0 };
    }

    const ids = pendingBreached.map((campaign) => campaign.id);

    await tx.campaign.updateMany({
      where: { id: { in: ids } },
      data: {
        escalatedAt: now,
        escalationReason: "Auto escalation: SLA breach (>24h pending)",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_BULK_ESCALATE_CAMPAIGNS",
        entity: "Campaign",
        details: `count=${ids.length}`,
      },
    });

    await tx.notification.createMany({
      data: pendingBreached.map((campaign) => ({
        userId: campaign.businessId,
        title: "Campaign escalated for priority review",
        message: `Your campaign "${campaign.title}" has been escalated because SLA threshold was breached.`,
        type: "WARNING" as const,
      })),
    });

    return { escalated: ids.length };
  });

  return NextResponse.json({
    message:
      result.escalated > 0
        ? `Escalated ${result.escalated} breached campaigns`
        : "No breached pending campaigns to escalate",
    escalated: result.escalated,
  });
}


import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "DISMISS_ALL_FLAGS" | "RESOLVE_ALL_ESCALATIONS";
  };

  if (!body.action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  if (body.action === "DISMISS_ALL_FLAGS") {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { isSuspicious: true },
        data: {
          isSuspicious: false,
          suspiciousReason: null,
          flaggedAt: null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_DISMISS_ALL_USER_FLAGS",
          entity: "Risk",
          details: `count=${updated.count}`,
        },
      });

      return updated.count;
    });

    return NextResponse.json({ message: `Dismissed ${result} flagged user record(s).` });
  }

  if (body.action === "RESOLVE_ALL_ESCALATIONS") {
    const result = await prisma.$transaction(async (tx) => {
      const updatedCampaigns = await tx.campaign.updateMany({
        where: {
          status: "PENDING",
          escalatedAt: { not: null },
        },
        data: {
          escalatedAt: null,
          escalationReason: null,
        },
      });

      const resolvedEvents = await tx.securityEvent.updateMany({
        where: {
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedByUserId: session.user.id,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_RESOLVE_ALL_CAMPAIGN_ESCALATIONS",
          entity: "Risk",
          details: `campaigns=${updatedCampaigns.count}, securityEvents=${resolvedEvents.count}`,
        },
      });

      return {
        campaigns: updatedCampaigns.count,
        securityEvents: resolvedEvents.count,
      };
    });

    return NextResponse.json({
      message: `Resolved ${result.campaigns} escalated campaign(s) and ${result.securityEvents} open security event(s).`,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

function parseEntityId(details: string | null | undefined, key: string) {
  if (!details) return null;
  const match = details.match(new RegExp(`${key}=([^,]+)`, "i"));
  return match?.[1] || null;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: context.businessUserId },
    select: { id: true, title: true },
  });
  const campaignIdSet = new Set(campaigns.map((item) => item.id));

  const submissions = campaignIdSet.size
    ? await prisma.submission.findMany({
        where: { campaignId: { in: Array.from(campaignIdSet) } },
        select: { id: true, campaignId: true },
      })
    : [];
  const submissionIdSet = new Set(submissions.map((item) => item.id));

  const logs = await prisma.activityLog.findMany({
    where: {
      OR: [
        { userId: context.actorUserId },
        { userId: context.businessUserId },
        { entity: "Campaign" },
        { entity: "Submission" },
        { entity: "BusinessWallet" },
        { entity: "BusinessSettings" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const actorIds = Array.from(new Set(logs.map((item) => item.userId).filter(Boolean))) as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, role: true },
      })
    : [];
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  const relevant = logs.filter((log) => {
    if (log.userId === context.actorUserId || log.userId === context.businessUserId) return true;
    if (log.entity === "BusinessWallet" || log.entity === "BusinessSettings") {
      return log.userId === context.businessUserId;
    }
    if (log.entity === "Campaign") {
      const campaignId = parseEntityId(log.details, "campaignId");
      return campaignId ? campaignIdSet.has(campaignId) : false;
    }
    if (log.entity === "Submission") {
      const submissionId = parseEntityId(log.details, "submissionId");
      return submissionId ? submissionIdSet.has(submissionId) : false;
    }
    return false;
  });

  const paymentOrders = await prisma.paymentOrder.findMany({
    where: { userId: context.businessUserId },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      paidAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const walletTx = await prisma.walletTransaction.findMany({
    where: { userId: context.businessUserId },
    select: {
      id: true,
      amount: true,
      type: true,
      note: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const timeline = [
    ...relevant.map((log) => {
      const actor = log.userId ? actorMap.get(log.userId) : null;
      return {
        id: `activity-${log.id}`,
        kind: "ACTIVITY",
        action: log.action,
        actor: actor ? `${actor.name || actor.role} (${actor.role})` : "System",
        message: log.details || log.action,
        createdAt: log.createdAt.toISOString(),
      };
    }),
    ...paymentOrders.map((order) => ({
      id: `payment-${order.id}`,
      kind: "PAYMENT",
      action: `PAYMENT_${order.status}`,
      actor: "Payment Gateway",
      message:
        order.status === "PAID"
          ? `Funding payment of INR ${order.amount.toFixed(2)} settled successfully.`
          : order.status === "FAILED"
            ? `Funding payment of INR ${order.amount.toFixed(2)} failed.`
            : `Funding payment of INR ${order.amount.toFixed(2)} created.`,
      createdAt: (order.paidAt || order.createdAt).toISOString(),
    })),
    ...walletTx.map((tx) => ({
      id: `wallet-${tx.id}`,
      kind: "WALLET",
      action: tx.type,
      actor: "Wallet Ledger",
      message: tx.note || `${tx.type} wallet transaction`,
      createdAt: tx.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80);

  return NextResponse.json({ timeline });
}

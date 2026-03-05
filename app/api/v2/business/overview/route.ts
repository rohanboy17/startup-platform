import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [wallet, totalCampaigns, liveCampaigns, pendingCampaigns] = await Promise.all([
    ensureBusinessWalletSynced(session.user.id),
    prisma.campaign.count({ where: { businessId: session.user.id } }),
    prisma.campaign.count({ where: { businessId: session.user.id, status: "LIVE" } }),
    prisma.campaign.count({ where: { businessId: session.user.id, status: "PENDING" } }),
  ]);

  return NextResponse.json({
    wallet: {
      balance: wallet.balance,
      totalFunded: wallet.totalFunded,
      totalSpent: wallet.totalSpent,
      totalRefund: wallet.totalRefund,
    },
    totalCampaigns,
    liveCampaigns,
    pendingCampaigns,
  });
}

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminCampaignActions from "@/components/admin-campaign-actions";
import { formatMoney } from "@/lib/format-money";

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "PENDING" },
    include: {
      business: {
        select: { name: true, email: true },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Campaign Approval Queue</h2>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No pending campaigns.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{campaign.title}</p>
                  <p className="text-sm text-white/70">Category: {campaign.category}</p>
                </div>
                <p className="text-sm text-white/70">{campaign.description}</p>
                <p className="text-sm text-white/70">
                  Business: {campaign.business.name || "Unnamed"} ({campaign.business.email})
                </p>
                <p className="text-sm text-white/70">
                  Reward: INR {formatMoney(campaign.rewardPerTask)} | Budget: INR{" "}
                  {formatMoney(campaign.totalBudget)}
                </p>
                <p className="text-sm text-white/70">
                  Existing submissions: {campaign._count.submissions}
                </p>
                <p className="text-xs text-white/50">
                  Created: {new Date(campaign.createdAt).toLocaleString()}
                </p>
                <AdminCampaignActions campaignId={campaign.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

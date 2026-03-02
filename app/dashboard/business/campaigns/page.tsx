import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function CampaignsPage() {
  const session = await auth();

  const campaigns = await prisma.task.findMany({
    where: { businessId: session!.user.id },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Your Campaigns</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {campaigns.map((campaign) => {
          const spent = campaign.totalBudget - campaign.remainingBudget;
          const progress =
            campaign.totalBudget > 0
              ? Math.min(100, Math.round((spent / campaign.totalBudget) * 100))
              : 0;

          return (
            <Card
              key={campaign.id}
              className="rounded-2xl border-white/10 bg-white/5 transition hover:scale-[1.02]"
            >
              <CardContent className="space-y-4 p-6">
                <h3 className="text-xl font-semibold">{campaign.title}</h3>
                <p className="text-sm text-white/60">{campaign.description}</p>

                <div className="flex justify-between text-sm">
                  <span>Status: {campaign.status}</span>
                  <span>Budget Left: INR {campaign.remainingBudget}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Budget Consumption</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/50">
                    Spent INR {spent} of INR {campaign.totalBudget} | Submissions:{" "}
                    {campaign._count.submissions}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

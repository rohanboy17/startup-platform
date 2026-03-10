import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminCampaignActions from "@/components/admin-campaign-actions";
import AdminCampaignEscalationControls from "@/components/admin-campaign-escalation-controls";
import { formatMoney } from "@/lib/format-money";

type SearchParams = {
  q?: string;
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";
  sla?: "ALL" | "ON_TIME" | "AT_RISK" | "BREACHED" | "ESCALATED";
};

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "ALL";
  const slaFilter = params.sla || "ALL";
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [pendingOnTime, pendingAtRisk, pendingBreached, pendingEscalated] = await Promise.all([
    prisma.campaign.count({
      where: {
        status: "PENDING",
        createdAt: { gte: fourHoursAgo },
        escalatedAt: null,
      },
    }),
    prisma.campaign.count({
      where: {
        status: "PENDING",
        createdAt: { lt: fourHoursAgo, gte: twentyFourHoursAgo },
        escalatedAt: null,
      },
    }),
    prisma.campaign.count({
      where: {
        status: "PENDING",
        createdAt: { lt: twentyFourHoursAgo },
        escalatedAt: null,
      },
    }),
    prisma.campaign.count({
      where: {
        status: "PENDING",
        escalatedAt: { not: null },
      },
    }),
  ]);

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { business: { email: { contains: q, mode: "insensitive" } } },
              { business: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(slaFilter === "ON_TIME"
        ? { status: "PENDING", createdAt: { gte: fourHoursAgo }, escalatedAt: null }
        : slaFilter === "AT_RISK"
          ? { status: "PENDING", createdAt: { lt: fourHoursAgo, gte: twentyFourHoursAgo }, escalatedAt: null }
          : slaFilter === "BREACHED"
            ? { status: "PENDING", createdAt: { lt: twentyFourHoursAgo }, escalatedAt: null }
            : slaFilter === "ESCALATED"
              ? { status: "PENDING", escalatedAt: { not: null } }
              : {}),
    },
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
      <h2 className="text-3xl font-semibold">Campaign Management</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-emerald-300/20 bg-emerald-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-emerald-200/80">Pending On Time (&lt; 4h)</p>
            <p className="mt-2 text-2xl font-bold text-emerald-200">{pendingOnTime}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-amber-200/80">At Risk (4-24h)</p>
            <p className="mt-2 text-2xl font-bold text-amber-200">{pendingAtRisk}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-rose-300/20 bg-rose-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-rose-200/80">Breached (&gt; 24h)</p>
            <p className="mt-2 text-2xl font-bold text-rose-200">{pendingBreached}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-violet-300/20 bg-violet-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-violet-200/80">Escalated</p>
            <p className="mt-2 text-2xl font-bold text-violet-200">{pendingEscalated}</p>
          </CardContent>
        </Card>
      </div>

      <AdminCampaignEscalationControls />

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search campaign / business"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="LIVE">LIVE</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <select
              name="sla"
              defaultValue={slaFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All SLA</option>
              <option value="ON_TIME">On Time (&lt;4h)</option>
              <option value="AT_RISK">At Risk (4-24h)</option>
              <option value="BREACHED">Breached (&gt;24h)</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
            >
              Apply Filters
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No campaigns found for the selected filters.
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
                <p className="break-all text-sm text-white/70">
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
                <p className="text-xs text-white/50">
                  SLA:{" "}
                  {campaign.status !== "PENDING"
                    ? "Not in queue"
                    : campaign.escalatedAt
                      ? "Escalated"
                      : campaign.createdAt < twentyFourHoursAgo
                        ? "Breached"
                        : campaign.createdAt < fourHoursAgo
                          ? "At Risk"
                          : "On Time"}
                </p>
                <AdminCampaignActions
                  campaignId={campaign.id}
                  currentStatus={campaign.status}
                  queueAgeHours={Math.floor((now.getTime() - campaign.createdAt.getTime()) / (1000 * 60 * 60))}
                  escalatedAt={campaign.escalatedAt ? campaign.escalatedAt.toISOString() : null}
                  escalationReason={campaign.escalationReason}
                  initialTitle={campaign.title}
                  initialDescription={campaign.description}
                  initialCategory={campaign.category}
                  initialTaskLink={campaign.taskLink}
                  initialRewardPerTask={campaign.rewardPerTask}
                  initialTotalBudget={campaign.totalBudget}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

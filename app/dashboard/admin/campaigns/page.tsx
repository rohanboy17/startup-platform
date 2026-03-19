import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminCampaignActions from "@/components/admin-campaign-actions";
import AdminCampaignEscalationControls from "@/components/admin-campaign-escalation-controls";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type SearchParams = {
  q?: string;
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";
  sla?: "ALL" | "ON_TIME" | "AT_RISK" | "BREACHED" | "ESCALATED";
  limit?: string;
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
  const limit = [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
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
    take: limit,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">Campaign Approvals</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review new campaign requests, watch approval speed, and step in before launch delays affect businesses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New in last 4h" value={pendingOnTime} tone="success" />
        <KpiCard label="Needs attention" value={pendingAtRisk} tone="warning" />
        <KpiCard label="Overdue" value={pendingBreached} tone="danger" />
        <KpiCard label="Escalated" value={pendingEscalated} tone="info" />
      </div>

      <AdminCampaignEscalationControls />

      <SectionCard elevated className="p-4">
          <form className="grid gap-3 md:grid-cols-5">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search campaign or business"
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
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
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All review speeds</option>
              <option value="ON_TIME">New (&lt;4h)</option>
              <option value="AT_RISK">Needs attention (4-24h)</option>
              <option value="BREACHED">Overdue (&gt;24h)</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <select
              name="limit"
              defaultValue={String(limit)}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">Show 5</option>
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.10]"
            >
              Apply
            </button>
          </form>
      </SectionCard>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              No campaigns match the current filters.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{campaign.title}</p>
                  <StatusBadge label={campaign.status} tone={campaign.status === "LIVE" ? "success" : campaign.status === "REJECTED" ? "danger" : campaign.status === "PENDING" ? "warning" : "neutral"} />
                </div>
                <p className="text-sm text-foreground/70">Category: {campaign.category}</p>
                <p className="text-sm text-foreground/70">{campaign.description}</p>
                <p className="break-all text-sm text-foreground/70">
                  Business account: {campaign.business.name || "Unnamed"} ({campaign.business.email})
                </p>
                <p className="text-sm text-foreground/70">
                  Reward: INR {formatMoney(campaign.rewardPerTask)} | Budget: INR{" "}
                  {formatMoney(campaign.totalBudget)}
                </p>
                <p className="text-sm text-foreground/70">
                  Submission mode:{" "}
                  {campaign.submissionMode === "ONE_PER_USER"
                    ? "One submission per user"
                    : "Many submissions per user"}
                </p>
                {campaign.tutorialVideoUrl ? (
                  <p className="text-sm text-foreground/70">
                    Tutorial video: attached
                  </p>
                ) : null}
                <p className="text-sm text-foreground/70">
                  Responses received: {campaign._count.submissions}
                </p>
                <p className="text-xs text-foreground/55">
                  Created: {new Date(campaign.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-foreground/55">
                  Review speed:{" "}
                  <StatusBadge
                    label={campaign.status !== "PENDING"
                      ? "Already processed"
                      : campaign.escalatedAt
                        ? "Escalated"
                        : campaign.createdAt < twentyFourHoursAgo
                          ? "Overdue"
                          : campaign.createdAt < fourHoursAgo
                            ? "Needs attention"
                            : "On track"}
                    tone={campaign.status !== "PENDING"
                      ? "neutral"
                      : campaign.escalatedAt
                        ? "info"
                        : campaign.createdAt < twentyFourHoursAgo
                          ? "danger"
                          : campaign.createdAt < fourHoursAgo
                            ? "warning"
                            : "success"}
                    className="ml-2"
                  />
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
                  initialTutorialVideoUrl={campaign.tutorialVideoUrl}
                  initialRewardPerTask={campaign.rewardPerTask}
                  initialTotalBudget={campaign.totalBudget}
                  initialSubmissionMode={campaign.submissionMode}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

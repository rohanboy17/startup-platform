import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminUserFlagActions from "@/components/admin-user-flag-actions";
import AdminUserReactivateButton from "@/components/admin-user-reactivate-button";
import AdminCampaignEscalationButton from "@/components/admin-campaign-escalation-button";
import AdminWithdrawalActions from "@/components/admin-withdrawal-actions";
import AdminSecurityControlPanel from "@/components/admin-security-control-panel";
import AdminTwoFactorToggleCard from "@/components/admin-2fa-toggle-card";
import AdminTwoFactorRecoveryCodesCard from "@/components/admin-2fa-recovery-codes-card";
import AdminRiskBulkActions from "@/components/admin-risk-bulk-actions";
import { formatMoney } from "@/lib/format-money";
import { getRateLimitStats } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

type QueueItem = {
  id: string;
  kind: "USER" | "CAMPAIGN" | "WITHDRAWAL";
  score: number;
  openedAt: Date;
};

type SearchParams = {
  limit?: string;
};

function hoursSince(date: Date, nowMs: number) {
  return Math.max(0, Math.floor((nowMs - date.getTime()) / (1000 * 60 * 60)));
}

export default async function AdminRiskCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const limit =
    params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const session = await auth();
  if (!session) return null;
  const riskyWithdrawalThreshold = Number(process.env.RISK_WITHDRAWAL_ALERT_AMOUNT ?? 3000);
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    flaggedUsers,
    blockedUsers,
    escalatedCampaigns,
    riskyWithdrawals,
    ipRules,
    securityEvents,
    me,
    recoveryActiveCount,
    recoveryUsedCount,
    latestRecoveryCode,
  ] =
    await Promise.all([
    prisma.user.findMany({
      where: { isSuspicious: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        suspiciousReason: true,
        flaggedAt: true,
      },
      orderBy: { flaggedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.user.findMany({
      where: {
        accountStatus: { in: ["SUSPENDED", "BANNED"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        statusReason: true,
        statusUpdatedAt: true,
      },
      orderBy: { statusUpdatedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.campaign.findMany({
      where: {
        status: "PENDING",
        escalatedAt: { not: null },
      },
      include: {
        business: {
          select: { name: true, email: true },
        },
      },
      orderBy: { escalatedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.withdrawal.findMany({
      where: {
        status: "PENDING",
        OR: [{ amount: { gte: riskyWithdrawalThreshold } }, { createdAt: { lt: staleCutoff } }],
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      ...(limit ? { take: limit } : {}),
    }),
    prisma.ipAccessRule.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      take: 120,
    }),
    prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, twoFactorEnabledAt: true },
    }),
    prisma.adminTwoFactorRecoveryCode.count({
      where: { userId: session.user.id, usedAt: null },
    }),
    prisma.adminTwoFactorRecoveryCode.count({
      where: { userId: session.user.id, usedAt: { not: null } },
    }),
    prisma.adminTwoFactorRecoveryCode.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const queue: QueueItem[] = [
    ...flaggedUsers.map((user) => {
      const openedAt = user.flaggedAt || new Date();
      const ageHours = Math.max(0, Math.floor((now.getTime() - openedAt.getTime()) / (1000 * 60 * 60)));
      const score =
        70 +
        (user.accountStatus === "BANNED" ? 15 : user.accountStatus === "SUSPENDED" ? 10 : 0) +
        Math.min(20, Math.floor(ageHours / 12));

      return { id: user.id, kind: "USER" as const, score, openedAt };
    }),
    ...escalatedCampaigns.map((campaign) => {
      const openedAt = campaign.escalatedAt || campaign.createdAt;
      const ageHours = Math.max(
        0,
        Math.floor((now.getTime() - campaign.createdAt.getTime()) / (1000 * 60 * 60))
      );
      const score = 65 + (ageHours > 24 ? 20 : ageHours > 4 ? 10 : 0);
      return { id: campaign.id, kind: "CAMPAIGN" as const, score, openedAt };
    }),
    ...riskyWithdrawals.map((withdrawal) => {
      const ageHours = Math.max(
        0,
        Math.floor((now.getTime() - withdrawal.createdAt.getTime()) / (1000 * 60 * 60))
      );
      const score =
        55 +
        (withdrawal.amount >= riskyWithdrawalThreshold * 2 ? 25 : withdrawal.amount >= riskyWithdrawalThreshold ? 15 : 5) +
        Math.min(15, Math.floor(ageHours / 6));

      return { id: withdrawal.id, kind: "WITHDRAWAL" as const, score, openedAt: withdrawal.createdAt };
    }),
  ].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.openedAt.getTime() - b.openedAt.getTime();
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Risk Center</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/65">
            Review suspicious accounts, escalated campaigns, and risky withdrawals from one place.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white sm:min-w-[120px]"
            >
              <option value="5">Show 5</option>
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="ALL">Show all</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Apply
            </button>
          </form>
          <AdminRiskBulkActions />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-amber-100/80">Flagged Users</p>
            <p className="mt-2 text-2xl font-bold text-amber-100">{flaggedUsers.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-rose-300/20 bg-rose-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-rose-100/80">Suspended / Banned</p>
            <p className="mt-2 text-2xl font-bold text-rose-100">{blockedUsers.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-violet-300/20 bg-violet-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-violet-100/80">Escalated Campaigns</p>
            <p className="mt-2 text-2xl font-bold text-violet-100">{escalatedCampaigns.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-cyan-300/20 bg-cyan-500/10">
          <CardContent className="p-5">
            <p className="text-sm text-cyan-100/80">Risky Withdrawals</p>
            <p className="mt-2 text-2xl font-bold text-cyan-100">{riskyWithdrawals.length}</p>
            <p className="mt-1 text-xs text-cyan-100/70">Threshold: INR {formatMoney(riskyWithdrawalThreshold)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-5">
          <p className="mb-3 text-sm text-white/60">Priority review list</p>
          {queue.length === 0 ? (
            <p className="text-sm text-emerald-300">No high-priority items right now.</p>
          ) : (
            <div className="space-y-2">
              {queue.slice(0, limit ?? queue.length).map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-white/80">
                    {item.kind} | Open for {hoursSince(item.openedAt, now.getTime())}h
                  </span>
                  <span className="font-semibold text-amber-300">Priority {item.score}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm text-white/60">Flagged Users</p>
            {flaggedUsers.length === 0 ? (
              <p className="text-sm text-white/50">No flagged users right now.</p>
            ) : (
              flaggedUsers.map((user) => (
                <div key={user.id} className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="break-all font-medium">{user.name || "Unnamed"} ({user.email})</p>
                  <p className="text-xs text-white/60">
                    Role: {user.role} | Status: {user.accountStatus} | Flagged:{" "}
                    {user.flaggedAt ? new Date(user.flaggedAt).toLocaleString() : "N/A"}
                  </p>
                  {user.suspiciousReason ? (
                    <p className="text-xs text-amber-200">Reason: {user.suspiciousReason}</p>
                  ) : null}
                  <AdminUserFlagActions userId={user.id} isSuspicious />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm text-white/60">Suspended / banned accounts</p>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-white/50">No suspended or banned users right now.</p>
            ) : (
              blockedUsers.map((user) => (
                <div key={user.id} className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="break-all font-medium">{user.name || "Unnamed"} ({user.email})</p>
                  <p className="text-xs text-white/60">
                    Role: {user.role} | Status: {user.accountStatus} | Updated:{" "}
                    {user.statusUpdatedAt ? new Date(user.statusUpdatedAt).toLocaleString() : "N/A"}
                  </p>
                  {user.statusReason ? <p className="text-xs text-rose-200">Reason: {user.statusReason}</p> : null}
                  <AdminUserReactivateButton userId={user.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm text-white/60">Escalated campaigns</p>
            {escalatedCampaigns.length === 0 ? (
              <p className="text-sm text-white/50">No escalated campaigns right now.</p>
            ) : (
              escalatedCampaigns.map((campaign) => (
                <div key={campaign.id} className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="font-medium">{campaign.title}</p>
                  <p className="break-all text-xs text-white/60">
                    Business: {campaign.business.name || "Unnamed"} ({campaign.business.email})
                  </p>
                  <p className="text-xs text-white/60">
                    Created: {new Date(campaign.createdAt).toLocaleString()} | Escalated:{" "}
                    {campaign.escalatedAt ? new Date(campaign.escalatedAt).toLocaleString() : "N/A"}
                  </p>
                  {campaign.escalationReason ? (
                    <p className="text-xs text-violet-200">Reason: {campaign.escalationReason}</p>
                  ) : null}
                  <AdminCampaignEscalationButton campaignId={campaign.id} mode="CLEAR_ESCALATION" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm text-white/60">High-risk pending withdrawals</p>
            {riskyWithdrawals.length === 0 ? (
              <p className="text-sm text-white/50">No high-risk withdrawals right now.</p>
            ) : (
              riskyWithdrawals.map((w) => (
                <div key={w.id} className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="font-medium">INR {formatMoney(w.amount)}</p>
                  <p className="break-all text-xs text-white/60">
                    {w.user.name || "Unnamed"} ({w.user.email}) | Created: {new Date(w.createdAt).toLocaleString()}
                  </p>
                  <p className="break-all text-xs text-white/60">UPI: {w.upiName || "N/A"} | {w.upiId || "N/A"}</p>
                  <AdminWithdrawalActions withdrawalId={w.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AdminSecurityControlPanel
        rules={ipRules.map((rule) => ({
          id: rule.id,
          ip: rule.ip,
          type: rule.type,
          note: rule.note,
          isActive: rule.isActive,
          expiresAt: rule.expiresAt ? rule.expiresAt.toISOString() : null,
        }))}
        events={securityEvents.map((event) => ({
          id: event.id,
          kind: event.kind,
          severity: event.severity,
          status: event.status,
          ipAddress: event.ipAddress,
          userId: event.userId,
          message: event.message,
          createdAt: event.createdAt.toISOString(),
        }))}
        rateStats={getRateLimitStats()}
      />

      <AdminTwoFactorToggleCard
        enabled={Boolean(me?.twoFactorEnabled)}
        enabledAt={me?.twoFactorEnabledAt ? me.twoFactorEnabledAt.toISOString() : null}
      />
      <AdminTwoFactorRecoveryCodesCard
        enabled={Boolean(me?.twoFactorEnabled)}
        activeCount={recoveryActiveCount}
        usedCount={recoveryUsedCount}
        lastGeneratedAt={latestRecoveryCode?.createdAt ? latestRecoveryCode.createdAt.toISOString() : null}
      />
    </div>
  );
}

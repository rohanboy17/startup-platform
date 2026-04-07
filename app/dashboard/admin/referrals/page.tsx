import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { getReferralSettings } from "@/lib/referrals";
import AdminReferralCodeToggle from "@/components/admin-referral-code-toggle";

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Calcutta",
  }).format(value);
}

export default async function AdminReferralsPage() {
  const settings = getReferralSettings();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalCodes,
    totalInvites,
    rewardedInvites,
    pendingInvites,
    rejectedInvites,
    totalCoinBalance,
    totalCoinsCredited,
    monthlyCoinsRedeemed,
    monthlyPerkCreditsGranted,
    suspiciousRewardedInvites,
    recentInvites,
    recentRedemptions,
    topReferrers,
  ] = await Promise.all([
    prisma.referralCode.count({ where: { isActive: true } }),
    prisma.referralInvite.count(),
    prisma.referralInvite.count({ where: { status: "REWARDED" } }),
    prisma.referralInvite.count({ where: { status: "PENDING" } }),
    prisma.referralInvite.count({ where: { status: "REJECTED" } }),
    prisma.user.aggregate({ _sum: { coinBalance: true } }),
    prisma.coinTransaction.aggregate({
      where: {
        type: "CREDIT",
        source: { in: ["REFERRAL_REWARD", "REFERRAL_WELCOME_BONUS"] },
      },
      _sum: { amount: true },
    }),
    prisma.coinRedemption.aggregate({
      where: { status: "APPROVED", createdAt: { gte: monthStart } },
      _sum: { coinsUsed: true },
    }),
    prisma.coinRedemption.aggregate({
      where: { status: "APPROVED", createdAt: { gte: monthStart } },
      _sum: { perkCreditsGranted: true },
    }),
    prisma.referralInvite.count({
      where: {
        status: "REWARDED",
        OR: [{ referrer: { isSuspicious: true } }, { referred: { isSuspicious: true } }],
      },
    }),
    prisma.referralInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
            isSuspicious: true,
            accountStatus: true,
            referralCode: {
              select: {
                code: true,
                isActive: true,
              },
            },
          },
        },
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            isSuspicious: true,
            accountStatus: true,
            totalApproved: true,
          },
        },
      },
    }),
    prisma.coinRedemption.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isSuspicious: true,
          },
        },
      },
    }),
    prisma.referralInvite.groupBy({
      by: ["referrerUserId"],
      where: { status: "REWARDED" },
      _count: { _all: true },
      orderBy: {
        _count: {
          referrerUserId: "desc",
        },
      },
      take: 10,
    }),
  ]);

  const topReferrerUsers =
    topReferrers.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topReferrers.map((item) => item.referrerUserId) } },
          select: {
            id: true,
            name: true,
            email: true,
            coinBalance: true,
            isSuspicious: true,
            referralCode: {
              select: {
                code: true,
                isActive: true,
              },
            },
          },
        })
      : [];

  const topReferrerMap = new Map(topReferrerUsers.map((user) => [user.id, user]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Growth controls</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Referral monitoring</h2>
          <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
            Monitor referral adoption, coin issuance, perk conversions, and suspicious reward patterns from one admin view.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" className="border-foreground/15 bg-background/60 text-foreground hover:bg-foreground/[0.08] hover:text-foreground">
            <a href="/api/admin/export/referrals?type=invites">Export invites CSV</a>
          </Button>
          <Button asChild variant="outline" className="border-foreground/15 bg-background/60 text-foreground hover:bg-foreground/[0.08] hover:text-foreground">
            <a href="/api/admin/export/referrals?type=redemptions">Export conversions CSV</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard label="Active codes" value={totalCodes} />
        <KpiCard label="Total invites" value={totalInvites} />
        <KpiCard label="Rewarded invites" value={rewardedInvites} tone="success" />
        <KpiCard label="Pending invites" value={pendingInvites} tone="warning" />
        <KpiCard label="Rejected invites" value={rejectedInvites} tone="danger" />
        <KpiCard label="Coins in circulation" value={totalCoinBalance._sum.coinBalance ?? 0} tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <SectionCard elevated className="space-y-4 lg:col-span-2">
          <div>
            <p className="text-sm text-foreground/60">Program settings snapshot</p>
            <h3 className="text-xl font-semibold text-foreground">Current reward rules</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Referrer reward</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{settings.referralRewardCoins} coins</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">New user bonus</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{settings.newUserBonusCoins} coins</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Conversion minimum</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{settings.redeemMinCoins} coins</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Monthly conversion cap</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{settings.redeemMonthlyLimit} coins</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-4 lg:col-span-2">
          <div>
            <p className="text-sm text-foreground/60">Monthly movement</p>
            <h3 className="text-xl font-semibold text-foreground">Coins to perk conversion</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Coins credited</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{totalCoinsCredited._sum.amount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Coins converted this month</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{monthlyCoinsRedeemed._sum.coinsUsed ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Perk credits granted this month</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{Math.floor(monthlyPerkCreditsGranted._sum.perkCreditsGranted ?? 0)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            Suspicious rewarded invites detected: <span className="font-semibold">{suspiciousRewardedInvites}</span>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-4 p-4">
          <div>
            <p className="text-sm text-foreground/60">Recent referral invites</p>
            <h3 className="text-xl font-semibold text-foreground">Qualification funnel</h3>
          </div>

          {recentInvites.length === 0 ? (
            <p className="text-sm text-foreground/60">No referral invites yet.</p>
          ) : (
            <div className="space-y-3">
              {recentInvites.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {invite.referrer.name?.trim() || invite.referrer.email} invited {invite.referred.name?.trim() || invite.referred.email}
                      </p>
                      <p className="mt-1 break-all text-sm text-foreground/60">Code used: {invite.codeUsed}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        invite.status === "REWARDED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                          : invite.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : invite.status === "REJECTED"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                              : "bg-sky-500/15 text-sky-200"
                      }`}
                    >
                      {invite.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm text-foreground/65 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Created</p>
                      <p>{formatDate(invite.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Qualified</p>
                      <p>{formatDate(invite.qualifiedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Rewarded</p>
                      <p>{formatDate(invite.rewardedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Referred approvals</p>
                      <p>{invite.referred.totalApproved}</p>
                    </div>
                  </div>

                  {invite.referrer.referralCode ? (
                    <div className="mt-3 border-t border-foreground/10 pt-3">
                      <AdminReferralCodeToggle
                        userId={invite.referrer.id}
                        code={invite.referrer.referralCode.code}
                        isActive={invite.referrer.referralCode.isActive}
                      />
                    </div>
                  ) : null}

                  {invite.referrer.isSuspicious || invite.referred.isSuspicious ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
                      Fraud review: suspicious account involved
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard elevated className="space-y-4 p-4">
            <div>
              <p className="text-sm text-foreground/60">Top referrers</p>
              <h3 className="text-xl font-semibold text-foreground">Users earning the most referral rewards</h3>
            </div>

            {topReferrers.length === 0 ? (
              <p className="text-sm text-foreground/60">No rewarded referrers yet.</p>
            ) : (
              <div className="space-y-3">
                {topReferrers.map((item) => {
                  const user = topReferrerMap.get(item.referrerUserId);
                  return (
                    <div key={item.referrerUserId} className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user?.name?.trim() || user?.email || item.referrerUserId}</p>
                          <p className="text-sm text-foreground/60">{item._count._all} rewarded invite(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-foreground/60">Coin balance</p>
                          <p className="font-semibold text-foreground">{user?.coinBalance ?? 0}</p>
                        </div>
                      </div>
                      {user?.isSuspicious ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Suspicious user</p>
                      ) : null}
                      {user?.referralCode ? (
                        <div className="mt-3 border-t border-foreground/10 pt-3">
                          <AdminReferralCodeToggle
                            userId={user.id}
                            code={user.referralCode.code}
                            isActive={user.referralCode.isActive}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard elevated className="space-y-4 p-4">
            <div>
              <p className="text-sm text-foreground/60">Recent conversions</p>
              <h3 className="text-xl font-semibold text-foreground">Coins converted into perk credits</h3>
            </div>

            {recentRedemptions.length === 0 ? (
              <p className="text-sm text-foreground/60">No coin conversions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentRedemptions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.user.name?.trim() || item.user.email}</p>
                        <p className="text-sm text-foreground/60">{formatDate(item.createdAt)}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                            : item.status === "REJECTED"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                              : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-foreground/65 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Coins used</p>
                        <p>{item.coinsUsed}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Perk credits granted</p>
                        <p>{Math.floor(item.perkCreditsGranted)}</p>
                      </div>
                    </div>
                    {item.user.isSuspicious ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Suspicious user</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

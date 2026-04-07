import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import PlatformPayoutRequest from "@/components/platform-payout-request";
import PlatformPayoutActions from "@/components/platform-payout-actions";
import AdminWalletAdjustmentReviewActions from "@/components/admin-wallet-adjustment-review-actions";
import { reconcileTreasuryBalance } from "@/lib/treasury";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";

type SearchParams = {
  limit?: string;
};

function resolveIntlLocale(locale: string) {
  if (locale === "hi") return "hi-IN";
  if (locale === "bn") return "bn-IN";
  return "en-IN";
}

function formatDateTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("admin.revenuePage"),
    getLocale(),
  ]);
  const params = await searchParams;
  const limit = params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const payoutDailyLimit = Number(process.env.PAYOUT_DAILY_LIMIT ?? 200000);
  const payoutPerRequestLimit = Number(process.env.PAYOUT_MAX_REQUEST ?? 50000);
  const delegates = prisma as unknown as {
    platformTreasury?: {
      upsert: (args: {
        where: { id: string };
        update: object;
        create: { id: string; balance: number };
      }) => Promise<{ balance: number }>;
    };
    platformPayout?: {
      findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<
        Array<{
          id: string;
          amount: number;
          note: string | null;
          status: string;
          createdAt: Date;
          processedAt: Date | null;
        }>
      >;
    };
    platformEarning?: {
      aggregate: (args: { _sum: { amount: true } }) => Promise<{ _sum: { amount: number | null } }>;
    };
    walletAdjustmentRequest?: {
      findMany: (args: {
        where: { status: "PENDING" };
        include: {
          targetUser: { select: { name: true; email: true } };
          requestedByUser: { select: { name: true; email: true } };
        };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          amount: number;
          type: "CREDIT" | "DEBIT";
          reason: string;
          createdAt: Date;
          targetUser: { name: string | null; email: string };
          requestedByUser: { name: string | null; email: string };
        }>
      >;
    };
  };

  const [treasury, platformRevenue, payouts, pendingAdjustments] = await Promise.all([
    delegates.platformTreasury
      ? delegates.platformTreasury.upsert({
          where: { id: "main" },
          update: {},
          create: { id: "main", balance: 0 },
        })
      : Promise.resolve({ balance: 0 }),
    delegates.platformEarning
      ? delegates.platformEarning.aggregate({
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    delegates.platformPayout
      ? delegates.platformPayout.findMany({
          orderBy: { createdAt: "desc" },
          ...(limit ? { take: limit } : { take: 500 }),
        })
      : Promise.resolve([]),
    delegates.walletAdjustmentRequest
      ? delegates.walletAdjustmentRequest.findMany({
          where: { status: "PENDING" },
          include: {
            targetUser: { select: { name: true, email: true } },
            requestedByUser: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          ...(limit ? { take: limit } : { take: 500 }),
        })
      : Promise.resolve([]),
  ]);
  const reconciledBalance =
    delegates.platformTreasury && delegates.platformPayout && delegates.platformEarning
      ? await reconcileTreasuryBalance()
      : treasury.balance;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayPayouts = payouts.filter((p) => p.createdAt >= todayStart);
  const todayRequestedAmount = todayPayouts
    .filter((p) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("title")}</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard label={t("kpis.totalCommissionEarned")} value={`INR ${formatMoney(platformRevenue._sum.amount)}`} tone="success" />
        <div className="surface-card premium-ring-hover rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{t("kpis.treasuryAvailable")}</p>
          <p className="kpi-value mt-2 text-2xl font-semibold text-foreground">INR {formatMoney(reconciledBalance)}</p>
          <p className="mt-2 text-xs text-foreground/50">
            {t("kpis.payoutLimits", {
              perRequest: formatMoney(payoutPerRequestLimit),
              daily: formatMoney(payoutDailyLimit),
            })}
          </p>
          <StatusBadge label={t("kpis.todayRequested", { amount: formatMoney(todayRequestedAmount) })} tone="neutral" className="mt-2" />
        </div>
      </div>

      {!delegates.platformTreasury || !delegates.platformPayout ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-800 dark:text-amber-200">
            {t("unavailable")}
          </CardContent>
        </Card>
      ) : (
        <PlatformPayoutRequest />
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold">{t("adjustments.title")}</h3>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm text-foreground/65">{t("filters.show")}</label>
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="ALL">{t("filters.showAll")}</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.12]"
            >
              {t("filters.apply")}
            </button>
            <Link
              href="/dashboard/admin/revenue"
              className="rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.08]"
            >
              {t("filters.clear")}
            </Link>
          </form>
        </div>
        {pendingAdjustments.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/60">
              {t("adjustments.empty")}
            </CardContent>
          </Card>
        ) : (
          pendingAdjustments.map((item) => (
            <Card key={item.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">
                    {item.type} INR {formatMoney(item.amount)}
                  </p>
                  <p className="text-sm text-foreground/70">{formatDateTime(item.createdAt, locale)}</p>
                </div>
                <p className="text-sm text-foreground/70">
                  {t("adjustments.target", { name: item.targetUser.name || t("fallbacks.unnamed"), email: item.targetUser.email })}
                </p>
                <p className="text-sm text-foreground/70">
                  {t("adjustments.requestedBy", { name: item.requestedByUser.name || t("fallbacks.unnamed"), email: item.requestedByUser.email })}
                </p>
                <p className="text-sm text-foreground/70">{t("adjustments.reason", { value: item.reason })}</p>
                <AdminWalletAdjustmentReviewActions requestId={item.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold">{t("payouts.title")}</h3>
          <Link
            href="/api/admin/revenue/payouts/export?status=ALL"
            className="rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-center text-sm text-foreground hover:bg-foreground/[0.08]"
          >
            {t("payouts.export")}
          </Link>
        </div>
        {payouts.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/60">
              {t("payouts.empty")}
            </CardContent>
          </Card>
        ) : (
          payouts.map((payout) => (
            <Card key={payout.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">INR {formatMoney(payout.amount)}</p>
                  <StatusBadge label={payout.status} tone={payout.status === "APPROVED" ? "success" : payout.status === "REJECTED" ? "danger" : "warning"} />
                </div>
                {payout.note ? <p className="text-sm text-foreground/70">{payout.note}</p> : null}
                <p className="text-xs text-foreground/50">
                  {t("payouts.requested", { value: formatDateTime(payout.createdAt, locale) })}
                </p>
                {payout.processedAt ? (
                  <p className="text-xs text-foreground/50">
                    {t("payouts.processed", { value: formatDateTime(payout.processedAt, locale) })}
                  </p>
                ) : null}
                {payout.status !== "APPROVED" ? (
                  <PlatformPayoutActions payoutId={payout.id} status={payout.status as "PENDING" | "APPROVED" | "REJECTED"} />
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

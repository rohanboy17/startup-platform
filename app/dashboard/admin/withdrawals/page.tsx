import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import AdminWithdrawalActions from "@/components/admin-withdrawal-actions";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";

type SearchParams = {
  q?: string;
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
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

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("admin.withdrawalsPage"),
    getLocale(),
  ]);
  const params = await searchParams;
  const commissionRate = Number(process.env.WITHDRAWAL_COMMISSION_RATE ?? 0.02);
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "ALL";
  const limit =
    params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;

  const [withdrawals, totals] = await Promise.all([
    prisma.withdrawal.findMany({
      where: {
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(q
          ? {
              OR: [
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
                { upiId: { contains: q, mode: "insensitive" } },
                { upiName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.withdrawal.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const pendingCount = totals.find((t) => t.status === "PENDING")?._count._all || 0;
  const approvedCount = totals.find((t) => t.status === "APPROVED")?._count._all || 0;
  const rejectedCount = totals.find((t) => t.status === "REJECTED")?._count._all || 0;
  const pendingItems = withdrawals.filter((w) => w.status === "PENDING");
  const pendingGross = pendingItems.reduce((sum, w) => sum + w.amount, 0);
  const pendingFee = pendingItems.reduce(
    (sum, w) => sum + Number((w.amount * commissionRate).toFixed(2)),
    0
  );
  const pendingPayout = Number((pendingGross - pendingFee).toFixed(2));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{t("title")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t("kpis.waitingReview")} value={pendingCount} tone="warning" />
        <KpiCard label={t("kpis.approved")} value={approvedCount} tone="success" />
        <KpiCard label={t("kpis.rejected")} value={rejectedCount} tone="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t("kpis.grossRequested")} value={`INR ${formatMoney(pendingGross)}`} />
        <KpiCard label={t("kpis.platformFeeHeld")} value={`INR ${formatMoney(pendingFee)}`} tone="warning" />
        <KpiCard label={t("kpis.netPayoutDue")} value={`INR ${formatMoney(pendingPayout)}`} tone="info" />
      </div>

      <Card className="rounded-2xl border-foreground/10 bg-background/60">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("filters.searchPlaceholder")}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">{t("filters.statusAll")}</option>
              <option value="PENDING">{t("status.pending")}</option>
              <option value="APPROVED">{t("status.approved")}</option>
              <option value="REJECTED">{t("status.rejected")}</option>
            </select>
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">{t("filters.showFive")}</option>
              <option value="10">{t("filters.showTen")}</option>
              <option value="20">{t("filters.showTwenty")}</option>
              <option value="ALL">{t("filters.showAll")}</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.10]"
              >
                {t("filters.apply")}
              </button>
              <a
                href="/dashboard/admin/withdrawals"
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.06]"
              >
                {t("filters.reset")}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              {t("empty")}
            </CardContent>
          </Card>
        ) : (
          withdrawals.map((w) => {
            const fee = Number((w.amount * commissionRate).toFixed(2));
            const payout = Number((w.amount - fee).toFixed(2));

            return (
              <Card key={w.id} className="rounded-2xl border-foreground/10 bg-background/60">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <p className="font-medium">{w.user.name || w.user.email}</p>
                      <p className="text-sm text-foreground/70">{w.user.email}</p>
                      <p className="text-xs text-foreground/55">
                        {t("fields.upi", { name: w.upiName || t("fields.na"), id: w.upiId || t("fields.na") })}
                      </p>
                      <p className="text-xs text-foreground/55">
                        {formatDateTime(w.createdAt, locale)}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-semibold">INR {formatMoney(w.amount)}</p>
                      <div className="mt-1">
                        <StatusBadge label={w.status} tone={w.status === "APPROVED" ? "success" : w.status === "REJECTED" ? "danger" : "warning"} />
                      </div>
                    </div>
                  </div>

                  <div className="text-sm break-words text-foreground/70">
                    {t("fields.feeBreakdown", {
                      rate: (commissionRate * 100).toFixed(1),
                      fee: formatMoney(fee),
                      payout: formatMoney(payout),
                    })}
                  </div>
                  {w.adminNote ? <p className="text-xs text-foreground/65">{t("fields.reviewNote", { note: w.adminNote })}</p> : null}
                  {w.processedAt ? (
                    <p className="text-xs text-foreground/55">
                      {t("fields.processed", { value: formatDateTime(w.processedAt, locale) })}
                    </p>
                  ) : null}

                  {w.status === "PENDING" ? (
                    <AdminWithdrawalActions withdrawalId={w.id} />
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

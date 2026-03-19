import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import ProofImageDialog from "@/components/proof-image-dialog";
import AdminBusinessFundingActions from "@/components/admin-business-funding-actions";
import AdminBusinessRefundActions from "@/components/admin-business-refund-actions";

type SearchParams = {
  q?: string;
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  flagged?: "ALL" | "FLAGGED" | "CLEAR";
  dateFrom?: string;
  dateTo?: string;
};

type FundingStatus = "PENDING" | "APPROVED" | "REJECTED";

function fundingTone(status: FundingStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

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

export default async function AdminFundingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("admin.fundingPage"),
    getLocale(),
  ]);
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "ALL";
  const flaggedFilter = params.flagged || "ALL";
  const dateFrom = params.dateFrom?.trim() || "";
  const dateTo = params.dateTo?.trim() || "";

  const createdAtFilter = {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000+05:30`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999+05:30`) } : {}),
  };

  const fundingWhere: Prisma.BusinessFundingWhereInput = {
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(dateFrom || dateTo ? { createdAt: createdAtFilter } : {}),
    ...(flaggedFilter === "FLAGGED"
      ? { flaggedReason: { not: null as string | null } }
      : flaggedFilter === "CLEAR"
        ? { flaggedReason: null as string | null }
        : {}),
    ...(q
      ? {
          OR: [
            { referenceId: { contains: q, mode: "insensitive" as const } },
            { utr: { contains: q, mode: "insensitive" as const } },
            { business: { name: { contains: q, mode: "insensitive" as const } } },
            { business: { email: { contains: q, mode: "insensitive" as const } } },
            { business: { mobile: { contains: q, mode: "insensitive" as const } } },
            { reviewNote: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const refundWhere: Prisma.BusinessRefundRequestWhereInput = {
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(dateFrom || dateTo ? { createdAt: createdAtFilter } : {}),
    ...(flaggedFilter === "FLAGGED"
      ? { flaggedReason: { not: null as string | null } }
      : flaggedFilter === "CLEAR"
        ? { flaggedReason: null as string | null }
        : {}),
    ...(q
      ? {
          OR: [
            { business: { name: { contains: q, mode: "insensitive" as const } } },
            { business: { email: { contains: q, mode: "insensitive" as const } } },
            { business: { mobile: { contains: q, mode: "insensitive" as const } } },
            { requestNote: { contains: q, mode: "insensitive" as const } },
            { reviewNote: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [requests, totals, refundRequests, refundTotals] = await Promise.all([
    prisma.businessFunding.findMany({
      where: fundingWhere,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          },
        },
        reviewedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.businessFunding.groupBy({
      where: fundingWhere,
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.businessRefundRequest.findMany({
      where: refundWhere,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          },
        },
        reviewedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.businessRefundRequest.groupBy({
      where: refundWhere,
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const pendingCount = totals.find((item) => item.status === "PENDING")?._count._all || 0;
  const approvedCount = totals.find((item) => item.status === "APPROVED")?._count._all || 0;
  const rejectedCount = totals.find((item) => item.status === "REJECTED")?._count._all || 0;
  const pendingAmount = totals.find((item) => item.status === "PENDING")?._sum.amount || 0;
  const flaggedCount = requests.filter((item) => Boolean(item.flaggedReason)).length;
  const pendingRefundCount = refundTotals.find((item) => item.status === "PENDING")?._count._all || 0;
  const pendingRefundAmount = refundTotals.find((item) => item.status === "PENDING")?._sum.amount || 0;
  const flaggedRefundCount = refundRequests.filter((item) => Boolean(item.flaggedReason)).length;

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (statusFilter !== "ALL") exportParams.set("status", statusFilter);
  if (flaggedFilter !== "ALL") exportParams.set("flagged", flaggedFilter);
  if (dateFrom) exportParams.set("dateFrom", dateFrom);
  if (dateTo) exportParams.set("dateTo", dateTo);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{t("title")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label={t("kpis.waitingReview")} value={pendingCount} tone="warning" />
        <KpiCard label={t("kpis.pendingAmount")} value={`INR ${formatMoney(pendingAmount)}`} tone="info" />
        <KpiCard label={t("kpis.approvedRequests")} value={approvedCount} tone="success" />
        <KpiCard label={t("kpis.rejectedRequests")} value={rejectedCount} tone="danger" />
        <KpiCard label={t("kpis.flaggedRequests")} value={flaggedCount} tone="danger" />
      </div>

      <Card className="rounded-2xl border-foreground/10 bg-background/60">
        <CardContent className="p-4">
          <div className="mb-3 text-xs text-foreground/60">
            {t("filters.helper")}
          </div>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_0.8fr_0.8fr_0.9fr_0.9fr_auto_auto_auto_auto]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("filters.searchPlaceholder")}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">{t("filters.statusAll")}</option>
              <option value="PENDING">{t("status.pending")}</option>
              <option value="APPROVED">{t("status.approved")}</option>
              <option value="REJECTED">{t("status.rejected")}</option>
            </select>
            <select
              name="flagged"
              defaultValue={flaggedFilter}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">{t("filters.flaggedAll")}</option>
              <option value="FLAGGED">{t("filters.flaggedOnly")}</option>
              <option value="CLEAR">{t("filters.clearFlags")}</option>
            </select>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              aria-label={t("filters.dateFrom")}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              aria-label={t("filters.dateTo")}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              {t("filters.apply")}
            </button>
            <Link
              href="/dashboard/admin/funding"
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.04]"
            >
              {t("filters.clear")}
            </Link>
            <Link
              href={`/api/admin/funding/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              {t("filters.exportFunding")}
            </Link>
            <Link
              href={`/api/admin/refunds/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              {t("filters.exportRefund")}
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              {t("funding.empty")}
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {request.business.name || t("fields.unnamedBusiness")}
                    </p>
                    <p className="text-sm text-foreground/70 break-all">{request.business.email}</p>
                    {request.business.mobile ? (
                      <p className="text-xs text-foreground/55">{t("fields.phone", { value: request.business.mobile })}</p>
                    ) : null}
                    <p className="text-xs text-foreground/55">
                      {t("fields.submitted", { value: formatDateTime(request.createdAt, locale) })}
                    </p>
                  </div>

                  <div className="space-y-2 sm:text-right">
                    <p className="text-xl font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                    <StatusBadge label={t(`status.${request.status.toLowerCase()}`)} tone={fundingTone(request.status)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("fields.referenceId")}</p>
                    <p className="mt-2 break-all text-sm font-medium text-foreground">{request.referenceId}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("fields.utr")}</p>
                    <p className="mt-2 break-all text-sm font-medium text-foreground">{request.utr || t("fields.notProvided")}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("fields.proof")}</p>
                    <div className="mt-2">
                      <ProofImageDialog
                        url={request.proofImage}
                        label={t("fields.openScreenshot")}
                        title={t("fields.fundingProofTitle")}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("fields.reviewStatus")}</p>
                    <p className="mt-2 text-sm text-foreground/70">
                      {request.reviewedAt
                        ? t("fields.reviewed", { value: formatDateTime(request.reviewedAt, locale) })
                        : t("fields.waitingForReview")}
                    </p>
                    {request.reviewedBy ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        {t("fields.reviewedBy", { value: request.reviewedBy.name || request.reviewedBy.email })}
                      </p>
                    ) : null}
                  </div>
                </div>

                {request.flaggedReason ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                    {t("fields.reviewFlag", { value: request.flaggedReason })}
                  </div>
                ) : null}

                {request.reviewNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    {t("fields.reviewNote", { value: request.reviewNote })}
                  </div>
                ) : null}

                {request.status === "PENDING" ? (
                  <AdminBusinessFundingActions fundingId={request.id} />
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-semibold">{t("refund.title")}</h3>
        <p className="max-w-3xl text-sm text-foreground/70">
          {t("refund.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t("refund.kpis.waitingReview")} value={pendingRefundCount} tone="warning" />
        <KpiCard label={t("refund.kpis.pendingAmount")} value={`INR ${formatMoney(pendingRefundAmount)}`} tone="info" />
        <KpiCard label={t("refund.kpis.flaggedRequests")} value={flaggedRefundCount} tone="danger" />
      </div>

      <div className="space-y-4">
        {refundRequests.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              {t("refund.empty")}
            </CardContent>
          </Card>
        ) : (
          refundRequests.map((request) => (
            <Card key={request.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {request.business.name || t("fields.unnamedBusiness")}
                    </p>
                    <p className="text-sm text-foreground/70 break-all">{request.business.email}</p>
                    {request.business.mobile ? (
                      <p className="text-xs text-foreground/55">{t("fields.phone", { value: request.business.mobile })}</p>
                    ) : null}
                    <p className="text-xs text-foreground/55">
                      {t("fields.submitted", { value: formatDateTime(request.createdAt, locale) })}
                    </p>
                  </div>

                  <div className="space-y-2 sm:text-right">
                    <p className="text-xl font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                    <StatusBadge label={t(`status.${request.status.toLowerCase()}`)} tone={fundingTone(request.status)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("refund.fields.requestType")}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{t("refund.fields.walletRefund")}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("fields.reviewStatus")}</p>
                    <p className="mt-2 text-sm text-foreground/70">
                      {request.reviewedAt
                        ? t("fields.reviewed", { value: formatDateTime(request.reviewedAt, locale) })
                        : t("fields.waitingForReview")}
                    </p>
                    {request.reviewedBy ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        {t("fields.reviewedBy", { value: request.reviewedBy.name || request.reviewedBy.email })}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("refund.fields.requestedAmount")}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">INR {formatMoney(request.amount)}</p>
                  </div>
                </div>

                {request.requestNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    {t("refund.fields.requestNote", { value: request.requestNote })}
                  </div>
                ) : null}

                {request.flaggedReason ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                    {t("fields.reviewFlag", { value: request.flaggedReason })}
                  </div>
                ) : null}

                {request.reviewNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    {t("fields.reviewNote", { value: request.reviewNote })}
                  </div>
                ) : null}

                {request.status === "PENDING" ? (
                  <AdminBusinessRefundActions refundRequestId={request.id} />
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

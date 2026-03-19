import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

function fundingTone(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

export default async function AdminFundingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
        <h2 className="text-3xl font-semibold">Manual Business Funding</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review QR and UPI payment receipts, verify the screenshot, and credit the business wallet only after confirmation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Waiting review" value={pendingCount} tone="warning" />
        <KpiCard label="Pending amount" value={`INR ${formatMoney(pendingAmount)}`} tone="info" />
        <KpiCard label="Approved requests" value={approvedCount} tone="success" />
        <KpiCard label="Rejected requests" value={rejectedCount} tone="danger" />
        <KpiCard label="Flagged requests" value={flaggedCount} tone="danger" />
      </div>

      <Card className="rounded-2xl border-foreground/10 bg-background/60">
        <CardContent className="p-4">
          <div className="mb-3 text-xs text-foreground/60">
            These filters apply to both manual funding requests and manual refund requests.
          </div>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_0.8fr_0.8fr_0.9fr_0.9fr_auto_auto_auto_auto]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by business, reference ID, UTR, phone, or notes"
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All status</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select
              name="flagged"
              defaultValue={flaggedFilter}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All review flags</option>
              <option value="FLAGGED">Flagged only</option>
              <option value="CLEAR">No flags</option>
            </select>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              Apply filters
            </button>
            <Link
              href="/dashboard/admin/funding"
              className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.04]"
            >
              Clear
            </Link>
            <Link
              href={`/api/admin/funding/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              Export funding CSV
            </Link>
            <Link
              href={`/api/admin/refunds/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
              className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-center text-sm text-foreground transition hover:bg-foreground/[0.1]"
            >
              Export refund CSV
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              No manual funding requests found for the current filters.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {request.business.name || "Unnamed business"}
                    </p>
                    <p className="text-sm text-foreground/70 break-all">{request.business.email}</p>
                    {request.business.mobile ? (
                      <p className="text-xs text-foreground/55">Phone: {request.business.mobile}</p>
                    ) : null}
                    <p className="text-xs text-foreground/55">
                      Submitted: {new Date(request.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="space-y-2 sm:text-right">
                    <p className="text-xl font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                    <StatusBadge label={request.status} tone={fundingTone(request.status)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Reference ID</p>
                    <p className="mt-2 break-all text-sm font-medium text-foreground">{request.referenceId}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">UTR</p>
                    <p className="mt-2 break-all text-sm font-medium text-foreground">{request.utr || "Not provided"}</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Proof</p>
                    <div className="mt-2">
                      <ProofImageDialog
                        url={request.proofImage}
                        label="Open screenshot"
                        title="Funding proof screenshot"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Review status</p>
                    <p className="mt-2 text-sm text-foreground/70">
                      {request.reviewedAt
                        ? `Reviewed ${new Date(request.reviewedAt).toLocaleString("en-IN")}`
                        : "Still waiting for review"}
                    </p>
                    {request.reviewedBy ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        By {request.reviewedBy.name || request.reviewedBy.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                {request.flaggedReason ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                    Review flag: {request.flaggedReason}
                  </div>
                ) : null}

                {request.reviewNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    Review note: {request.reviewNote}
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
        <h3 className="text-2xl font-semibold">Manual Business Refunds</h3>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review business refund requests before wallet balances are reduced. Approval now moves funds out of the business wallet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Refunds waiting review" value={pendingRefundCount} tone="warning" />
        <KpiCard label="Pending refund amount" value={`INR ${formatMoney(pendingRefundAmount)}`} tone="info" />
        <KpiCard label="Flagged refund requests" value={flaggedRefundCount} tone="danger" />
      </div>

      <div className="space-y-4">
        {refundRequests.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              No manual refund requests found yet.
            </CardContent>
          </Card>
        ) : (
          refundRequests.map((request) => (
            <Card key={request.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {request.business.name || "Unnamed business"}
                    </p>
                    <p className="text-sm text-foreground/70 break-all">{request.business.email}</p>
                    {request.business.mobile ? (
                      <p className="text-xs text-foreground/55">Phone: {request.business.mobile}</p>
                    ) : null}
                    <p className="text-xs text-foreground/55">
                      Submitted: {new Date(request.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="space-y-2 sm:text-right">
                    <p className="text-xl font-semibold text-foreground">INR {formatMoney(request.amount)}</p>
                    <StatusBadge label={request.status} tone={fundingTone(request.status)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Request type</p>
                    <p className="mt-2 text-sm font-medium text-foreground">Wallet refund</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Review status</p>
                    <p className="mt-2 text-sm text-foreground/70">
                      {request.reviewedAt
                        ? `Reviewed ${new Date(request.reviewedAt).toLocaleString("en-IN")}`
                        : "Still waiting for review"}
                    </p>
                    {request.reviewedBy ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        By {request.reviewedBy.name || request.reviewedBy.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">Requested amount</p>
                    <p className="mt-2 text-sm font-medium text-foreground">INR {formatMoney(request.amount)}</p>
                  </div>
                </div>

                {request.requestNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    Request note: {request.requestNote}
                  </div>
                ) : null}

                {request.flaggedReason ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                    Review flag: {request.flaggedReason}
                  </div>
                ) : null}

                {request.reviewNote ? (
                  <div className="rounded-2xl border border-foreground/10 bg-background/55 p-4 text-sm text-foreground/75">
                    Review note: {request.reviewNote}
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

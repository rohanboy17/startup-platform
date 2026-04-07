import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import AdminBusinessKycActions from "@/components/admin-business-kyc-actions";
import AdminBusinessWalletActions from "@/components/admin-business-wallet-actions";
import AdminUserStatusActions from "@/components/admin-user-status-actions";
import AdminKycRequestsPanel from "@/components/admin-kyc-requests-panel";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type SearchParams = {
  q?: string;
  kyc?: "ALL" | "PENDING" | "VERIFIED" | "REJECTED";
  status?: "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";
  limit?: string;
};

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const kycFilter = params.kyc || "ALL";
  const statusFilter = params.status || "ALL";
  const limit = params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;

  const where = {
    role: "BUSINESS" as const,
    businessOwnerId: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(kycFilter !== "ALL" ? { kycStatus: kycFilter } : {}),
    ...(statusFilter !== "ALL" ? { accountStatus: statusFilter } : {}),
  };

  const [businesses, totals, teamMembers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        statusReason: true,
        statusUpdatedAt: true,
        kycStatus: true,
        kycNotes: true,
        kycVerifiedAt: true,
        balance: true,
        createdAt: true,
      },
    }),
    prisma.user.groupBy({
      by: ["kycStatus"],
      where: { role: "BUSINESS", businessOwnerId: null },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: {
        role: "BUSINESS",
        businessOwnerId: { not: null },
      },
    }),
  ]);

  const pendingKyc = totals.find((t) => t.kycStatus === "PENDING")?._count._all || 0;
  const verifiedKyc = totals.find((t) => t.kycStatus === "VERIFIED")?._count._all || 0;
  const rejectedKyc = totals.find((t) => t.kycStatus === "REJECTED")?._count._all || 0;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Business Management</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="KYC Pending" value={pendingKyc} tone="warning" />
        <KpiCard label="KYC Verified" value={verifiedKyc} tone="success" />
        <KpiCard label="KYC Rejected" value={rejectedKyc} tone="danger" />
        <KpiCard label="Business Team Members" value={teamMembers} tone="info" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Pending KYC Requests</h3>
        <AdminKycRequestsPanel />
      </div>

      <SectionCard elevated className="p-4">
          <form className="grid gap-3 md:grid-cols-5 xl:items-end">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search business name or email"
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            />
            <select
              name="kyc"
              defaultValue={kycFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All KYC Status</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All Account Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">Show 5</option>
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="ALL">Show all</option>
            </select>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.12]"
              >
                Apply Filters
              </button>
              <a
                href="/dashboard/admin/businesses"
                className="rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-center text-sm text-foreground hover:bg-foreground/[0.08]"
              >
                Clear
              </a>
            </div>
          </form>
      </SectionCard>

      <div className="grid gap-6 md:grid-cols-2">
        {businesses.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60 md:col-span-2">
            <CardContent className="p-6 text-sm text-foreground/60">
              No standalone business accounts found for the selected filters.
            </CardContent>
          </Card>
        ) : null}
        {businesses.map((business) => (
          <Card key={business.id} className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold">{business.name || "Unnamed Business"}</h3>
              <p className="break-all text-sm text-foreground/70">{business.email}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={`Account: ${business.accountStatus}`}
                  tone={business.accountStatus === "ACTIVE" ? "success" : business.accountStatus === "SUSPENDED" ? "warning" : "danger"}
                />
                <StatusBadge
                  label={`KYC: ${business.kycStatus}`}
                  tone={business.kycStatus === "VERIFIED" ? "success" : business.kycStatus === "REJECTED" ? "danger" : "warning"}
                />
              </div>
              {business.statusReason ? (
                <p className="text-xs text-foreground/60">Account reason: {business.statusReason}</p>
              ) : null}
              {business.kycNotes ? (
                <p className="text-xs text-foreground/60">KYC notes: {business.kycNotes}</p>
              ) : null}
              {business.kycVerifiedAt ? (
                <p className="text-xs text-foreground/50">
                  KYC verified at: {new Date(business.kycVerifiedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="text-sm">Wallet: INR {formatMoney(business.balance)}</p>
              <p className="text-xs text-foreground/50">
                Joined: {new Date(business.createdAt).toLocaleDateString()}
              </p>

              <AdminBusinessKycActions userId={business.id} currentStatus={business.kycStatus} />
              <AdminUserStatusActions userId={business.id} currentStatus={business.accountStatus} />
              <AdminBusinessWalletActions businessId={business.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

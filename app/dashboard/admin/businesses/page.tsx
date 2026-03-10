import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import AdminBusinessKycActions from "@/components/admin-business-kyc-actions";
import AdminBusinessWalletActions from "@/components/admin-business-wallet-actions";
import AdminUserStatusActions from "@/components/admin-user-status-actions";
import AdminKycRequestsPanel from "@/components/admin-kyc-requests-panel";

type SearchParams = {
  q?: string;
  kyc?: "ALL" | "PENDING" | "VERIFIED" | "REJECTED";
  status?: "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";
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
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">KYC Pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{pendingKyc}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">KYC Verified</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{verifiedKyc}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">KYC Rejected</p>
            <p className="mt-1 text-2xl font-semibold text-rose-300">{rejectedKyc}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Business Team Members</p>
            <p className="mt-1 text-2xl font-semibold text-sky-300">{teamMembers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Pending KYC Requests</h3>
        <AdminKycRequestsPanel />
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search business name or email"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              name="kyc"
              defaultValue={kycFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All KYC Status</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Account Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
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

      <div className="grid gap-6 md:grid-cols-2">
        {businesses.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5 md:col-span-2">
            <CardContent className="p-6 text-sm text-white/60">
              No standalone business accounts found for the selected filters.
            </CardContent>
          </Card>
        ) : null}
        {businesses.map((business) => (
          <Card key={business.id} className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold">{business.name || "Unnamed Business"}</h3>
              <p className="break-all text-sm text-white/70">{business.email}</p>
              <p className="text-sm">
                Account: <span className="text-white/90">{business.accountStatus}</span>
              </p>
              {business.statusReason ? (
                <p className="text-xs text-white/60">Account reason: {business.statusReason}</p>
              ) : null}
              <p className="text-sm">
                KYC:{" "}
                <span
                  className={
                    business.kycStatus === "VERIFIED"
                      ? "text-emerald-300"
                      : business.kycStatus === "REJECTED"
                        ? "text-rose-300"
                        : "text-amber-300"
                  }
                >
                  {business.kycStatus}
                </span>
              </p>
              {business.kycNotes ? (
                <p className="text-xs text-white/60">KYC notes: {business.kycNotes}</p>
              ) : null}
              {business.kycVerifiedAt ? (
                <p className="text-xs text-white/50">
                  KYC verified at: {new Date(business.kycVerifiedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="text-sm">Wallet: INR {formatMoney(business.balance)}</p>
              <p className="text-xs text-white/50">
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

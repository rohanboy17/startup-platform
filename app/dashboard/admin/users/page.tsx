import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminUserFlagActions from "@/components/admin-user-flag-actions";
import AdminUserRoleActions from "@/components/admin-user-role-actions";
import AdminUserStatusActions from "@/components/admin-user-status-actions";
import AdminUserWalletAdjustment from "@/components/admin-user-wallet-adjustment";
import AdminUserBulkActions from "@/components/admin-user-bulk-actions";
import AdminUserLifecycleActions from "@/components/admin-user-lifecycle-actions";
import { formatMoney } from "@/lib/format-money";

type SearchParams = {
  q?: string;
  role?: "ALL" | "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
  status?: "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";
  flagged?: "ALL" | "FLAGGED" | "CLEAR";
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const roleFilter = params.role || "ALL";
  const statusFilter = params.status || "ALL";
  const flaggedFilter = params.flagged || "ALL";
  const exportQuery = new URLSearchParams({
    q,
    role: roleFilter,
    status: statusFilter,
    flagged: flaggedFilter,
  }).toString();

  let users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
    accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
    statusReason: string | null;
    statusUpdatedAt: Date | null;
    balance: number;
    ipAddress: string | null;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    flaggedAt: Date | null;
    createdAt: Date;
  }> = [];
  const activityMap: Record<string, Array<{ action: string; entity: string; createdAt: Date }>> = {};
  const latestSubmissionMap: Record<string, Date> = {};
  const latestWithdrawalMap: Record<string, Date> = {};
  let loadError = "";

  try {
    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
      ...(statusFilter !== "ALL" ? { accountStatus: statusFilter } : {}),
      ...(flaggedFilter === "FLAGGED"
        ? { isSuspicious: true }
        : flaggedFilter === "CLEAR"
          ? { isSuspicious: false }
          : {}),
    };

    users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        statusReason: true,
        statusUpdatedAt: true,
        balance: true,
        ipAddress: true,
        isSuspicious: true,
        suspiciousReason: true,
        flaggedAt: true,
        createdAt: true,
      },
    });

    if (users.length > 0) {
      const userIds = users.map((u) => u.id);

      const [activities, submissions, withdrawals] = await Promise.all([
        prisma.activityLog.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: "desc" },
          take: 1000,
          select: {
            userId: true,
            action: true,
            entity: true,
            createdAt: true,
          },
        }),
        prisma.submission.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: "desc" },
          take: 1000,
          select: {
            userId: true,
            createdAt: true,
          },
        }),
        prisma.withdrawal.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: "desc" },
          take: 1000,
          select: {
            userId: true,
            createdAt: true,
          },
        }),
      ]);

      for (const activity of activities) {
        if (!activity.userId) continue;
        if (!activityMap[activity.userId]) activityMap[activity.userId] = [];
        if (activityMap[activity.userId].length < 5) {
          activityMap[activity.userId].push({
            action: activity.action,
            entity: activity.entity,
            createdAt: activity.createdAt,
          });
        }
      }

      for (const submission of submissions) {
        if (!latestSubmissionMap[submission.userId]) {
          latestSubmissionMap[submission.userId] = submission.createdAt;
        }
      }

      for (const withdrawal of withdrawals) {
        if (!latestWithdrawalMap[withdrawal.userId]) {
          latestWithdrawalMap[withdrawal.userId] = withdrawal.createdAt;
        }
      }
    }
  } catch (error: unknown) {
    loadError = error instanceof Error ? error.message : "Failed to load users";
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">User Management</h2>

      {!loadError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-white/60">Total Results</p>
              <p className="mt-2 text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-white/60">Flagged Users</p>
              <p className="mt-2 text-2xl font-bold text-amber-300">
                {users.filter((user) => user.isSuspicious).length}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-white/60">Suspended</p>
              <p className="mt-2 text-2xl font-bold text-amber-300">
                {users.filter((user) => user.accountStatus === "SUSPENDED").length}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-white/60">Banned</p>
              <p className="mt-2 text-2xl font-bold text-rose-300">
                {users.filter((user) => user.accountStatus === "BANNED").length}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name or email"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              name="role"
              defaultValue={roleFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Roles</option>
              <option value="USER">USER</option>
              <option value="BUSINESS">BUSINESS</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
            <select
              name="flagged"
              defaultValue={flaggedFilter}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Risk States</option>
              <option value="FLAGGED">Flagged</option>
              <option value="CLEAR">Clear</option>
            </select>
            <div className="flex gap-2 md:col-span-4">
              <button
                type="submit"
                className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                Apply Filters
              </button>
              <a
                href={`/api/admin/export/users?${exportQuery}`}
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Export CSV
              </a>
              <a
                href="/dashboard/admin/users"
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Clear
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {!loadError && users.length > 0 ? (
        <AdminUserBulkActions
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }))}
        />
      ) : null}

      {loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {users.length === 0 ? (
            <Card className="rounded-2xl border-white/10 bg-white/5 md:col-span-2">
              <CardContent className="p-6 text-sm text-white/60">
                No users found for the selected filters.
              </CardContent>
            </Card>
          ) : null}
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-semibold">{user.name || "Unnamed User"}</h3>
                <p className="text-sm text-white/70">{user.email}</p>
                <p className="text-sm">Role: {user.role}</p>
                <p
                  className={`text-sm ${
                    user.accountStatus === "ACTIVE"
                      ? "text-emerald-300"
                      : user.accountStatus === "SUSPENDED"
                        ? "text-amber-300"
                        : "text-rose-300"
                  }`}
                >
                  Status: {user.accountStatus}
                </p>
                {user.statusReason ? (
                  <p className="text-xs text-white/60">Status Reason: {user.statusReason}</p>
                ) : null}
                {user.statusUpdatedAt ? (
                  <p className="text-xs text-white/50">
                    Status Updated: {new Date(user.statusUpdatedAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="text-sm">Balance: INR {formatMoney(user.balance)}</p>
                <p className="text-sm text-white/60">Last IP: {user.ipAddress || "unknown"}</p>
                <p
                  className={`text-sm ${
                    user.isSuspicious ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  {user.isSuspicious ? "Suspicious: FLAGGED" : "Suspicious: Clear"}
                </p>
                {user.suspiciousReason ? (
                  <p className="text-xs text-white/60">Reason: {user.suspiciousReason}</p>
                ) : null}
                {user.flaggedAt ? (
                  <p className="text-xs text-white/50">
                    Flagged: {new Date(user.flaggedAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="text-xs text-white/50">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-white/50">
                  Latest Submission:{" "}
                  {latestSubmissionMap[user.id]
                    ? new Date(latestSubmissionMap[user.id]).toLocaleString()
                    : "No submissions yet"}
                </p>
                <p className="text-xs text-white/50">
                  Latest Withdrawal:{" "}
                  {latestWithdrawalMap[user.id]
                    ? new Date(latestWithdrawalMap[user.id]).toLocaleString()
                    : "No withdrawals yet"}
                </p>

                <details className="rounded-md border border-white/10 bg-black/20 p-3">
                  <summary className="cursor-pointer text-sm text-white/80">
                    Activity Timeline
                  </summary>
                  <div className="mt-2 space-y-2">
                    {(activityMap[user.id] || []).length === 0 ? (
                      <p className="text-xs text-white/50">No recent activity events.</p>
                    ) : (
                      (activityMap[user.id] || []).map((event, idx) => (
                        <p key={`${event.action}-${event.createdAt.toISOString()}-${idx}`} className="text-xs text-white/60">
                          {new Date(event.createdAt).toLocaleString()} | {event.entity} | {event.action}
                        </p>
                      ))
                    )}
                  </div>
                </details>

                <AdminUserRoleActions userId={user.id} currentRole={user.role} />
                <AdminUserStatusActions
                  userId={user.id}
                  currentStatus={user.accountStatus}
                />
                {user.role !== "ADMIN" ? (
                  <AdminUserLifecycleActions
                    userId={user.id}
                    currentStatus={user.accountStatus}
                  />
                ) : null}
                <AdminUserWalletAdjustment userId={user.id} />

                {user.role !== "ADMIN" ? (
                  <AdminUserFlagActions userId={user.id} isSuspicious={user.isSuspicious} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

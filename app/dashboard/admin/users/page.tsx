import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminUserFlagActions from "@/components/admin-user-flag-actions";
import AdminUserRoleActions from "@/components/admin-user-role-actions";
import AdminUserStatusActions from "@/components/admin-user-status-actions";
import AdminUserWalletAdjustment from "@/components/admin-user-wallet-adjustment";
import AdminUserBulkActions from "@/components/admin-user-bulk-actions";
import AdminUserLifecycleActions from "@/components/admin-user-lifecycle-actions";
import AdminUserWorkAssignments from "@/components/admin-user-work-assignments";
import AdminBulkAssignBySkill from "@/components/admin-bulk-assign-by-skill";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

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
    mobile: string | null;
    defaultUpiId: string | null;
    defaultUpiName: string | null;
    telegramChatId: string | null;
    telegramLinkedAt: Date | null;
    role: "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
    timezone: string;
    accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
    statusReason: string | null;
    statusUpdatedAt: Date | null;
    kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
    kycVerifiedAt: Date | null;
    level: "L1" | "L2" | "L3" | "L4" | "L5";
    balance: number;
    coinBalance: number;
    dailySubmits: number;
    dailyApproved: number;
    totalApproved: number;
    totalRejected: number;
    emergencyWithdrawCount: number;
    monthlyEmergencyWithdrawCount: number;
    emergencyWithdrawMonthKey: string | null;
    lastLevelResetAt: Date;
    twoFactorEnabled: boolean;
    twoFactorEnabledAt: Date | null;
    ipAddress: string | null;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    flaggedAt: Date | null;
    createdAt: Date;
    deletedAt: Date | null;
  }> = [];
  const activityMap: Record<string, Array<{ action: string; entity: string; createdAt: Date }>> = {};
  const latestSubmissionMap: Record<string, Date> = {};
  const latestWithdrawalMap: Record<string, Date> = {};
  const userSkillsMap: Record<string, string[]> = {};
  const businessKycMap: Record<
    string,
    {
      legalName: string;
      contactName: string;
      phone: string;
      address: string;
      website: string | null;
      taxId: string | null;
      documentUrl: string | null;
      status: "PENDING" | "VERIFIED" | "REJECTED";
      updatedAt: Date;
    }
  > = {};
  let loadError = "";

  try {
    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { mobile: { contains: q, mode: "insensitive" as const } },
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
        mobile: true,
        defaultUpiId: true,
        defaultUpiName: true,
        telegramChatId: true,
        telegramLinkedAt: true,
        role: true,
        timezone: true,
        accountStatus: true,
        statusReason: true,
        statusUpdatedAt: true,
        kycStatus: true,
        kycVerifiedAt: true,
        level: true,
        balance: true,
        coinBalance: true,
        dailySubmits: true,
        dailyApproved: true,
        totalApproved: true,
        totalRejected: true,
        emergencyWithdrawCount: true,
        monthlyEmergencyWithdrawCount: true,
        emergencyWithdrawMonthKey: true,
        lastLevelResetAt: true,
        twoFactorEnabled: true,
        twoFactorEnabledAt: true,
        ipAddress: true,
        isSuspicious: true,
        suspiciousReason: true,
        flaggedAt: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (users.length > 0) {
      const userIds = users.map((u) => u.id);
      const businessIds = users.filter((u) => u.role === "BUSINESS").map((u) => u.id);

      const [activities, submissions, withdrawals, businessKycRequests] = await Promise.all([
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
        businessIds.length
          ? prisma.businessKycRequest.findMany({
              where: { businessId: { in: businessIds } },
              orderBy: { updatedAt: "desc" },
              take: 1000,
              select: {
                businessId: true,
                legalName: true,
                contactName: true,
                phone: true,
                address: true,
                website: true,
                taxId: true,
                documentUrl: true,
                status: true,
                updatedAt: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const userSkills = await prisma.userSkill.findMany({
        where: { userId: { in: userIds } },
        include: { skill: { select: { label: true } } },
        orderBy: { createdAt: "asc" },
      });

      for (const row of userSkills) {
        if (!userSkillsMap[row.userId]) userSkillsMap[row.userId] = [];
        userSkillsMap[row.userId].push(row.skill.label);
      }

      for (const req of businessKycRequests) {
        if (!businessKycMap[req.businessId]) {
          businessKycMap[req.businessId] = {
            legalName: req.legalName,
            contactName: req.contactName,
            phone: req.phone,
            address: req.address,
            website: req.website,
            taxId: req.taxId,
            documentUrl: req.documentUrl,
            status: req.status,
            updatedAt: req.updatedAt,
          };
        }
      }

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
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">People &amp; Accounts</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review account details, payout defaults, trust status, and recent activity from one place.
        </p>
      </div>

      {!loadError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Accounts found" value={users.length} />
          <KpiCard label="Needs review" value={users.filter((user) => user.isSuspicious).length} tone="warning" />
          <KpiCard label="Suspended accounts" value={users.filter((user) => user.accountStatus === "SUSPENDED").length} tone="warning" />
          <KpiCard label="Banned accounts" value={users.filter((user) => user.accountStatus === "BANNED").length} tone="danger" />
        </div>
      ) : null}

      <SectionCard elevated className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or mobile"
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            />
            <select
              name="role"
              defaultValue={roleFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">All account types</option>
              <option value="USER">USER</option>
              <option value="BUSINESS">BUSINESS</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">All account states</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
            <select
              name="flagged"
              defaultValue={flaggedFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">All trust states</option>
              <option value="FLAGGED">Flagged</option>
              <option value="CLEAR">Clear</option>
            </select>
            <div className="flex flex-col gap-2 sm:flex-row md:col-span-4">
              <button
                type="submit"
                className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.10]"
              >
                Apply
              </button>
              <a
                href={`/api/admin/export/users?${exportQuery}`}
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.06]"
              >
                Export CSV
              </a>
              <a
                href="/dashboard/admin/users"
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.06]"
              >
                Reset
              </a>
            </div>
          </form>
      </SectionCard>

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

      {!loadError ? <AdminBulkAssignBySkill /> : null}

      {loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {users.length === 0 ? (
            <Card className="rounded-2xl border-foreground/10 bg-background/60 md:col-span-2">
              <CardContent className="p-6 text-sm text-foreground/70">
                No accounts match the current filters.
              </CardContent>
            </Card>
          ) : null}
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl border-foreground/10 bg-background/60 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">
                      {user.name || "Unnamed User"}
                    </h3>
                    <p className="break-all text-sm text-foreground/70">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={`Role: ${user.role}`} tone="info" />
                    <StatusBadge
                      label={`Status: ${user.accountStatus}`}
                      tone={
                        user.accountStatus === "ACTIVE"
                          ? "success"
                          : user.accountStatus === "SUSPENDED"
                            ? "warning"
                            : "danger"
                      }
                    />
                    <StatusBadge
                      label={user.isSuspicious ? "Risk: Flagged" : "Risk: Clear"}
                      tone={user.isSuspicious ? "warning" : "success"}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      Account details
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p className="break-all">
                        <span className="text-foreground/60">Account ID:</span>{" "}
                        <span className="font-medium">{user.id}</span>
                      </p>
                      <p className="break-all">
                        <span className="text-foreground/60">Mobile:</span>{" "}
                        <span className="font-medium">{user.mobile || "Not set"}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Timezone:</span>{" "}
                        <span className="font-medium">{user.timezone}</span>
                      </p>
                      <p className="text-xs text-foreground/55">
                        Joined: {new Date(user.createdAt).toLocaleString()}
                      </p>
                      {user.deletedAt ? (
                        <p className="text-xs text-rose-500/90">
                          Deleted: {new Date(user.deletedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      Earnings &amp; level
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p>
                        <span className="text-foreground/60">Balance:</span>{" "}
                        <span className="font-semibold">INR {formatMoney(user.balance)}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Coins:</span>{" "}
                        <span className="font-medium">{user.coinBalance}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Level:</span>{" "}
                        <span className="font-medium">{user.level}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Submitted today:</span>{" "}
                        <span className="font-medium">{user.dailySubmits}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Approved today:</span>{" "}
                        <span className="font-medium">{user.dailyApproved}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Approved:</span>{" "}
                        <span className="font-medium">{user.totalApproved}</span>{" "}
                        <span className="text-foreground/50">|</span>{" "}
                        <span className="text-foreground/60">Rejected:</span>{" "}
                        <span className="font-medium">{user.totalRejected}</span>
                      </p>
                      <p className="text-xs text-foreground/55">
                        Daily level reset: {new Date(user.lastLevelResetAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      Account status
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p className="break-all">
                        <span className="text-foreground/60">Last sign-in IP:</span>{" "}
                        <span className="font-medium">{user.ipAddress || "unknown"}</span>
                      </p>
                      {user.statusReason ? (
                        <p className="break-words text-sm text-foreground/70">
                          <span className="text-foreground/60">Account note:</span>{" "}
                          <span className="font-medium">{user.statusReason}</span>
                        </p>
                      ) : null}
                      {user.statusUpdatedAt ? (
                        <p className="text-xs text-foreground/55">
                          Last account update: {new Date(user.statusUpdatedAt).toLocaleString()}
                        </p>
                      ) : null}
                      {user.suspiciousReason ? (
                        <p className="break-words text-sm text-foreground/70">
                          <span className="text-foreground/60">Trust note:</span>{" "}
                          <span className="font-medium">{user.suspiciousReason}</span>
                        </p>
                      ) : null}
                      {user.flaggedAt ? (
                        <p className="text-xs text-foreground/55">
                          Marked for review: {new Date(user.flaggedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      Payouts, security &amp; connections
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p>
                        <span className="text-foreground/60">Verification:</span>{" "}
                        <span className="font-medium">{user.kycStatus}</span>
                        {user.kycVerifiedAt ? (
                          <span className="text-foreground/55">
                            {" "}
                            (verified {new Date(user.kycVerifiedAt).toLocaleDateString()})
                          </span>
                        ) : null}
                      </p>
                      {user.role === "BUSINESS" && businessKycMap[user.id] ? (
                        <div className="rounded-lg border border-foreground/10 bg-background/60 p-2 text-sm">
                          <p className="font-medium">Latest business verification</p>
                          <p className="break-words text-foreground/70">
                            <span className="text-foreground/60">Legal:</span>{" "}
                            {businessKycMap[user.id].legalName}
                          </p>
                          <p className="break-words text-foreground/70">
                            <span className="text-foreground/60">Contact:</span>{" "}
                            {businessKycMap[user.id].contactName}
                          </p>
                          <p className="break-all text-foreground/70">
                            <span className="text-foreground/60">Phone:</span>{" "}
                            {businessKycMap[user.id].phone}
                          </p>
                          <p className="text-xs text-foreground/55">
                            Updated: {new Date(businessKycMap[user.id].updatedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : null}
                      <p className="break-all">
                        <span className="text-foreground/60">Telegram:</span>{" "}
                        <span className="font-medium">
                          {user.telegramChatId ? "Linked" : "Not linked"}
                        </span>
                        {user.telegramChatId ? (
                          <span className="text-foreground/55"> (chatId: {user.telegramChatId})</span>
                        ) : null}
                      </p>
                      {user.telegramLinkedAt ? (
                        <p className="text-xs text-foreground/55">
                          Telegram linked: {new Date(user.telegramLinkedAt).toLocaleString()}
                        </p>
                      ) : null}
                      <p className="break-all">
                        <span className="text-foreground/60">Default UPI:</span>{" "}
                        <span className="font-medium">
                          {user.defaultUpiId || user.defaultUpiName
                            ? `${user.defaultUpiId || "-"}${user.defaultUpiName ? ` (${user.defaultUpiName})` : ""}`
                            : "Not set"}
                        </span>
                      </p>
                      <p>
                        <span className="text-foreground/60">2FA:</span>{" "}
                        <span className="font-medium">
                          {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </span>
                        {user.twoFactorEnabledAt ? (
                          <span className="text-foreground/55">
                            {" "}
                            (since {new Date(user.twoFactorEnabledAt).toLocaleDateString()})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-foreground/55">
                        Emergency withdrawals: {user.emergencyWithdrawCount} (lifetime) |{" "}
                        {user.monthlyEmergencyWithdrawCount} (this month)
                      </p>
                      {user.emergencyWithdrawMonthKey ? (
                        <p className="text-xs text-foreground/55">
                          Emergency month key: {user.emergencyWithdrawMonthKey}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {user.role === "USER" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                        Skills
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(userSkillsMap[user.id] || []).length === 0 ? (
                          <p className="text-sm text-foreground/60">No skills added yet.</p>
                        ) : (
                          (userSkillsMap[user.id] || []).slice(0, 18).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-xs text-foreground/80"
                            >
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                      {(userSkillsMap[user.id] || []).length > 18 ? (
                        <p className="mt-2 text-xs text-foreground/55">
                          Showing 18 of {(userSkillsMap[user.id] || []).length} skills.
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                        Invite-only work access
                      </p>
                      <p className="mt-2 text-sm text-foreground/70">
                        Assign this user to private work-based campaigns when needed.
                      </p>
                      <div className="mt-3">
                        <AdminUserWorkAssignments
                          userId={user.id}
                          userSkills={userSkillsMap[user.id] || []}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 text-xs text-foreground/60 sm:grid-cols-2">
                  <p>
                    Latest submission:{" "}
                    {latestSubmissionMap[user.id]
                      ? new Date(latestSubmissionMap[user.id]).toLocaleString()
                      : "No submissions yet"}
                  </p>
                  <p>
                    Latest withdrawal:{" "}
                    {latestWithdrawalMap[user.id]
                      ? new Date(latestWithdrawalMap[user.id]).toLocaleString()
                      : "No withdrawals yet"}
                  </p>
                </div>

                <details className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                  <summary className="cursor-pointer text-sm text-foreground/80">
                    Recent activity
                  </summary>
                  <div className="mt-2 space-y-2">
                    {(activityMap[user.id] || []).length === 0 ? (
                      <p className="text-xs text-foreground/55">No recent activity yet.</p>
                    ) : (
                      (activityMap[user.id] || []).map((event, idx) => (
                        <p
                          key={`${event.action}-${event.createdAt.toISOString()}-${idx}`}
                          className="text-xs text-foreground/70"
                        >
                          {new Date(event.createdAt).toLocaleString()} | {event.entity} |{" "}
                          {event.action}
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

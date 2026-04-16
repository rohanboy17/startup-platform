import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import AdminUserFlagActions from "@/components/admin-user-flag-actions";
import AdminUserRoleActions from "@/components/admin-user-role-actions";
import AdminUserStatusActions from "@/components/admin-user-status-actions";
import AdminUserWalletAdjustment from "@/components/admin-user-wallet-adjustment";
import AdminUserBulkActions from "@/components/admin-user-bulk-actions";
import AdminUserLifecycleActions from "@/components/admin-user-lifecycle-actions";
import AdminUserWorkAssignments from "@/components/admin-user-work-assignments";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAppSettings } from "@/lib/system-settings";
import { calculateAgeFromDate, parseProfileDetails } from "@/lib/user-profile";
import { getTaxonomyOptionLabel } from "@/lib/work-taxonomy";

type SearchParams = {
  q?: string;
  role?: "ALL" | "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
  status?: "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";
  flagged?: "ALL" | "FLAGGED" | "CLEAR";
  workMode?: "ALL" | "WORK_FROM_HOME" | "WORK_FROM_OFFICE" | "WORK_IN_FIELD";
  workingPreference?: "ALL" | "SALARIED" | "FREELANCE_CONTRACTUAL" | "DAY_BASIS";
  education?: string;
  language?: string;
  limit?: string;
};

function containsText(source: string | null, query: string) {
  if (!query) return true;
  if (!source) return false;
  return source.toLowerCase().includes(query.toLowerCase());
}

function formatEnumLabel(value: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [t, locale, settings] = await Promise.all([
    getTranslations("admin.usersPage"),
    getLocale(),
    getAppSettings(),
  ]);
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const roleFilter = params.role || "ALL";
  const statusFilter = params.status || "ALL";
  const flaggedFilter = params.flagged || "ALL";
  const workModeFilter = params.workMode || "ALL";
  const workingPreferenceFilter = params.workingPreference || "ALL";
  const educationQuery = params.education?.trim() || "";
  const languageQuery = params.language?.trim() || "";
  const limit =
    params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const exportQuery = new URLSearchParams({
    q,
    role: roleFilter,
    status: statusFilter,
    flagged: flaggedFilter,
    workMode: workModeFilter,
    workingPreference: workingPreferenceFilter,
    education: educationQuery,
    language: languageQuery,
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
    profileDetails: unknown;
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
        profileDetails: true,
      },
    });

    users = users.filter((user) => {
      const profile = parseProfileDetails(user.profileDetails);
      if (workModeFilter !== "ALL" && profile.workMode !== workModeFilter) {
        return false;
      }
      if (
        workingPreferenceFilter !== "ALL" &&
        profile.workingPreference !== workingPreferenceFilter
      ) {
        return false;
      }
      if (!containsText(profile.educationQualification, educationQuery)) {
        return false;
      }
      if (
        languageQuery &&
        !profile.languages.some((language) =>
          language.toLowerCase().includes(languageQuery.toLowerCase())
        )
      ) {
        return false;
      }
      return true;
    });

    if (limit) {
      users = users.slice(0, limit);
    }

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
    loadError = error instanceof Error ? error.message : t("errors.failed");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{t("title")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          {t("subtitle")}
        </p>
      </div>

      {!loadError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label={t("kpis.accountsFound")} value={users.length} />
          <KpiCard label={t("kpis.needsReview")} value={users.filter((user) => user.isSuspicious).length} tone="warning" />
          <KpiCard label={t("kpis.suspendedAccounts")} value={users.filter((user) => user.accountStatus === "SUSPENDED").length} tone="warning" />
          <KpiCard label={t("kpis.bannedAccounts")} value={users.filter((user) => user.accountStatus === "BANNED").length} tone="danger" />
        </div>
      ) : null}

      <SectionCard elevated className="p-4">
          <form className="grid gap-3 md:grid-cols-5">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("filters.searchPlaceholder")}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            />
            <select
              name="role"
              defaultValue={roleFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">{t("filters.roleAll")}</option>
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
              <option value="ALL">{t("filters.statusAll")}</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
            <select
              name="flagged"
              defaultValue={flaggedFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">{t("filters.flaggedAll")}</option>
              <option value="FLAGGED">{t("filters.flagged")}</option>
              <option value="CLEAR">{t("filters.clear")}</option>
            </select>
            <select
              name="workMode"
              defaultValue={workModeFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">{t("filters.workModeAll")}</option>
              {settings.profileWorkModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="workingPreference"
              defaultValue={workingPreferenceFilter}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="ALL">{t("filters.preferenceAll")}</option>
              {settings.workingPreferenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="education"
              defaultValue={educationQuery}
              placeholder={t("filters.educationPlaceholder")}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            />
            <input
              type="text"
              name="language"
              defaultValue={languageQuery}
              placeholder={t("filters.languagePlaceholder")}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            />
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="5">{t("filters.showFive")}</option>
              <option value="10">{t("filters.showTen")}</option>
              <option value="20">{t("filters.showTwenty")}</option>
              <option value="ALL">{t("filters.showAll")}</option>
            </select>
            <div className="flex flex-col gap-2 sm:flex-row md:col-span-5">
              <button
                type="submit"
                className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.10]"
              >
                {t("filters.apply")}
              </button>
              <a
                href={`/api/admin/export/users?${exportQuery}`}
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.06]"
              >
                {t("filters.exportCsv")}
              </a>
              <a
                href="/dashboard/admin/users"
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-foreground/[0.06]"
              >
                {t("filters.reset")}
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

      {loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-800 dark:text-amber-200">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {users.length === 0 ? (
            <Card className="rounded-2xl border-foreground/10 bg-background/60 md:col-span-2">
              <CardContent className="p-6 text-sm text-foreground/70">
                {t("empty")}
              </CardContent>
            </Card>
          ) : null}
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl border-foreground/10 bg-background/60 shadow-sm">
              <CardContent className="space-y-4 p-6">
                {(() => {
                  const profile = parseProfileDetails(user.profileDetails);
                  const age = calculateAgeFromDate(profile.dateOfBirth);
                  return (
                    <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">
                      {user.name || t("fallbacks.unnamedUser")}
                    </h3>
                    <p className="break-all text-sm text-foreground/70">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={t("badges.role", { value: user.role })} tone="info" />
                    <StatusBadge
                      label={t("badges.status", { value: user.accountStatus })}
                      tone={
                        user.accountStatus === "ACTIVE"
                          ? "success"
                          : user.accountStatus === "SUSPENDED"
                            ? "warning"
                            : "danger"
                      }
                    />
                    <StatusBadge
                      label={user.isSuspicious ? t("badges.riskFlagged") : t("badges.riskClear")}
                      tone={user.isSuspicious ? "warning" : "success"}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      {t("sections.accountDetails")}
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p className="break-all">
                        <span className="text-foreground/60">{t("fields.accountId")}</span>{" "}
                        <span className="font-medium">{user.id}</span>
                      </p>
                      <p className="break-all">
                        <span className="text-foreground/60">{t("fields.mobile")}</span>{" "}
                        <span className="font-medium">{user.mobile || t("fields.notSet")}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.timezone")}</span>{" "}
                        <span className="font-medium">{user.timezone}</span>
                      </p>
                      <p className="text-xs text-foreground/55">
                        {t("fields.joined", { value: formatDateTime(user.createdAt, locale) })}
                      </p>
                      {user.deletedAt ? (
                        <p className="text-xs text-rose-500/90">
                          {t("fields.deleted", { value: formatDateTime(user.deletedAt, locale) })}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      {t("sections.earnings")}
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <p>
                        <span className="text-foreground/60">{t("fields.balance")}</span>{" "}
                        <span className="font-semibold">INR {formatMoney(user.balance)}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.coins")}</span>{" "}
                        <span className="font-medium">{user.coinBalance}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.level")}</span>{" "}
                        <span className="font-medium">{user.level}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.submittedToday")}</span>{" "}
                        <span className="font-medium">{user.dailySubmits}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.approvedToday")}</span>{" "}
                        <span className="font-medium">{user.dailyApproved}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">{t("fields.approved")}</span>{" "}
                        <span className="font-medium">{user.totalApproved}</span>{" "}
                        <span className="text-foreground/50">|</span>{" "}
                        <span className="text-foreground/60">{t("fields.rejected")}</span>{" "}
                        <span className="font-medium">{user.totalRejected}</span>
                      </p>
                      <p className="text-xs text-foreground/55">
                        {t("fields.dailyReset", { value: formatDateTime(user.lastLevelResetAt, locale) })}
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
                  <div className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      Profile details
                    </p>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                      <p className="break-words">
                        <span className="text-foreground/60">Address:</span>{" "}
                        <span className="font-medium">{profile.address || "Not set"}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Gender:</span>{" "}
                        <span className="font-medium">{formatEnumLabel(profile.gender)}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Religion:</span>{" "}
                        <span className="font-medium">{profile.religion || "Not set"}</span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Date of birth:</span>{" "}
                        <span className="font-medium">
                          {profile.dateOfBirth
                            ? `${profile.dateOfBirth}${age !== null ? ` (Age ${age})` : ""}`
                            : "Not set"}
                        </span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Work mode:</span>{" "}
                        <span className="font-medium">
                          {getTaxonomyOptionLabel(
                            profile.workMode,
                            settings.profileWorkModeOptions,
                            formatEnumLabel(profile.workMode)
                          )}
                        </span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Work time:</span>{" "}
                        <span className="font-medium">
                          {getTaxonomyOptionLabel(
                            profile.workTime,
                            settings.workTimeOptions,
                            formatEnumLabel(profile.workTime)
                          )}
                        </span>
                      </p>
                      <p>
                        <span className="text-foreground/60">Work preference:</span>{" "}
                        <span className="font-medium">
                          {getTaxonomyOptionLabel(
                            profile.workingPreference,
                            settings.workingPreferenceOptions,
                            formatEnumLabel(profile.workingPreference)
                          )}
                        </span>
                      </p>
                      <p className="break-words">
                        <span className="text-foreground/60">Education:</span>{" "}
                        <span className="font-medium">
                          {profile.educationQualification || "Not set"}
                        </span>
                      </p>
                      <p className="break-words md:col-span-2">
                        <span className="text-foreground/60">Course &amp; certificate:</span>{" "}
                        <span className="font-medium">
                          {profile.courseAndCertificate || "Not set"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                        Languages
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.languages.length === 0 ? (
                          <p className="text-sm text-foreground/60">No languages added yet.</p>
                        ) : (
                          profile.languages.map((language) => (
                            <span
                              key={language}
                              className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-xs text-foreground/80"
                            >
                              {language}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

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
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

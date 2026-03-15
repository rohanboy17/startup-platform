import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/system-settings";
import { formatMoney } from "@/lib/format-money";
import { getBusinessContext } from "@/lib/business-context";
import { getTranslations } from "next-intl/server";

function parseEntityId(details: string | null | undefined, key: string) {
  if (!details) return null;
  const match = details.match(new RegExp(`${key}=([^,]+)`, "i"));
  return match?.[1] || null;
}

function formatHours(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Not enough data";
  if (value < 1) return `${Math.round(value * 60)} min avg`;
  return `${value.toFixed(1)} hr avg`;
}

export default async function BusinessTrustPage() {
  const t = await getTranslations("business");
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    redirect("/dashboard");
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    redirect("/dashboard");
  }

  const now = new Date();
  const pendingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [settings, campaigns, submissions, paymentOrders, recentSubmissionLogs] = await Promise.all([
    getAppSettings(),
    prisma.campaign.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true,
        totalBudget: true,
        remainingBudget: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.submission.findMany({
      where: { campaign: { businessId: context.businessUserId } },
      select: {
        id: true,
        createdAt: true,
        managerStatus: true,
        adminStatus: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.paymentOrder.findMany({
      where: { userId: context.businessUserId },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.activityLog.findMany({
      where: {
        entity: "Submission",
        action: {
          in: [
            "MANAGER_APPROVED_SUBMISSION",
            "MANAGER_REJECTED_SUBMISSION",
            "ADMIN_APPROVED_SUBMISSION",
            "ADMIN_REJECTED_SUBMISSION",
          ],
        },
      },
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const submissionMap = new Map(submissions.map((item) => [item.id, item]));
  const managerDecisionHours: number[] = [];
  const adminDecisionHours: number[] = [];

  for (const log of recentSubmissionLogs) {
    const submissionId = parseEntityId(log.details, "submissionId");
    if (!submissionId) continue;
    const submission = submissionMap.get(submissionId);
    if (!submission) continue;

    const hours = (log.createdAt.getTime() - submission.createdAt.getTime()) / (1000 * 60 * 60);
    if (hours < 0) continue;

    if (log.action.startsWith("MANAGER_")) {
      managerDecisionHours.push(hours);
    }
    if (log.action.startsWith("ADMIN_")) {
      adminDecisionHours.push(hours);
    }
  }

  const avgManagerHours =
    managerDecisionHours.length > 0
      ? managerDecisionHours.reduce((sum, value) => sum + value, 0) / managerDecisionHours.length
      : 0;
  const avgAdminHours =
    adminDecisionHours.length > 0
      ? adminDecisionHours.reduce((sum, value) => sum + value, 0) / adminDecisionHours.length
      : 0;

  const pendingCampaigns = campaigns.filter((campaign) => campaign.status === "PENDING");
  const delayedPendingCampaigns = pendingCampaigns.filter((campaign) => campaign.createdAt < pendingCutoff);
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === "LIVE");
  const exhaustedCampaigns = liveCampaigns.filter(
    (campaign) => campaign.remainingBudget <= 0 || campaign.remainingBudget < 1
  );
  const failedPayments = paymentOrders.filter((order) => order.status === "FAILED");
  const successfulPayments = paymentOrders.filter((order) => order.status === "PAID");

  const totalCampaignBudget = campaigns.reduce((sum, campaign) => sum + campaign.totalBudget, 0);
  const lockedBudget = campaigns
    .filter((campaign) => ["PENDING", "APPROVED", "LIVE"].includes(campaign.status))
    .reduce((sum, campaign) => sum + campaign.remainingBudget, 0);

  const managerPending = submissions.filter((item) => item.managerStatus === "PENDING").length;
  const adminPending = submissions.filter(
    (item) => item.managerStatus === "MANAGER_APPROVED" && item.adminStatus === "PENDING"
  ).length;
  const approvedSubmissions = submissions.filter((item) => item.adminStatus === "ADMIN_APPROVED").length;
  const rejectedSubmissions = submissions.filter((item) => item.adminStatus === "ADMIN_REJECTED").length;
  const rejectionRate =
    approvedSubmissions + rejectedSubmissions > 0
      ? (rejectedSubmissions / (approvedSubmissions + rejectedSubmissions)) * 100
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business trust layer</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("trustPageTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Commercial terms, review flow, safety controls, and service timing in one business-facing page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
          <p className="text-sm text-white/60">Funding fee</p>
          <p className="mt-2 text-3xl font-semibold text-white">{(settings.fundingFeeRate * 100).toFixed(2)}%</p>
          <p className="mt-2 text-xs text-white/45">Applied on wallet top-ups and refund requests.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
          <p className="text-sm text-white/60">Locked campaign budget</p>
          <p className="mt-2 text-3xl font-semibold text-white">INR {formatMoney(lockedBudget)}</p>
          <p className="mt-2 text-xs text-white/45">Budget reserved across pending, approved, and live campaigns.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
          <p className="text-sm text-white/60">Avg manager review time</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatHours(avgManagerHours)}</p>
          <p className="mt-2 text-xs text-white/45">Based on recent submissions reviewed by managers.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
          <p className="text-sm text-white/60">Avg admin final review time</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatHours(avgAdminHours)}</p>
          <p className="mt-2 text-xs text-white/45">Measured from submission creation to final admin decision.</p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-white/60">Commercial model</p>
            <h3 className="text-xl font-semibold text-white">How money moves</h3>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            <p>Campaign creation locks the full budget immediately from the business wallet.</p>
            <p>On final admin approval, the full per-task reward is deducted from campaign remaining budget.</p>
            <p>User payout and platform commission are split internally after approval. Businesses are charged only from campaign budget, not an extra approval fee.</p>
            <p>Campaign edit budget increases deduct only the difference. Budget reductions release unused budget back to the business wallet.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>Total campaign budget launched so far: INR {formatMoney(totalCampaignBudget)}</p>
            <p className="mt-2">
              Recent payment health: {successfulPayments.length} paid, {failedPayments.length} failed orders.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-white/60">Review workflow</p>
            <h3 className="text-xl font-semibold text-white">What happens after launch</h3>
          </div>
          <ol className="space-y-3 text-sm text-white/70">
            <li>1. Business creates the campaign and budget is reserved.</li>
            <li>2. Admin reviews the campaign before it can go live.</li>
            <li>3. Users submit proof against live campaigns only.</li>
            <li>4. Manager performs the first moderation pass.</li>
            <li>5. Admin makes the final approval or rejection decision.</li>
            <li>6. On approval, wallet credit and platform commission are recorded atomically.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Pending manager review</p>
              <p className="mt-2 text-lg font-semibold text-white">{managerPending}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Pending admin review</p>
              <p className="mt-2 text-lg font-semibold text-white">{adminPending}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-white/60">Fraud and safety controls</p>
            <h3 className="text-xl font-semibold text-white">What protects campaign quality</h3>
          </div>
          <ul className="space-y-3 text-sm text-white/70">
            <li>Submission access is restricted to live campaigns with available budget.</li>
            <li>Proof passes through manager review and final admin review before payout.</li>
            <li>IP logging and suspicious-user monitoring support abuse detection.</li>
            <li>Wallet ledger entries and activity logs preserve a visible financial and moderation trail.</li>
            <li>Notification events are created on approval, rejection, and funding changes.</li>
          </ul>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>Current final rejection rate: {rejectionRate.toFixed(1)}%</p>
            <p className="mt-2">Approved submissions: {approvedSubmissions}</p>
            <p className="mt-2">Rejected submissions: {rejectedSubmissions}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-white/60">Service timing and operational status</p>
            <h3 className="text-xl font-semibold text-white">Current queue conditions</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Pending campaign approvals</p>
              <p className="mt-2 text-lg font-semibold text-white">{pendingCampaigns.length}</p>
              <p className="mt-1 text-xs text-white/45">{delayedPendingCampaigns.length} older than 24 hours</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Failed funding payments</p>
              <p className="mt-2 text-lg font-semibold text-white">{failedPayments.length}</p>
              <p className="mt-1 text-xs text-white/45">Recent failed orders needing retry or review</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Live campaigns at zero budget</p>
              <p className="mt-2 text-lg font-semibold text-white">{exhaustedCampaigns.length}</p>
              <p className="mt-1 text-xs text-white/45">Top-up or close these campaigns to avoid dead traffic</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Processing guidance</p>
              <p className="mt-2 text-lg font-semibold text-white">24h target</p>
              <p className="mt-1 text-xs text-white/45">Campaign review and queue monitoring target window</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/60">
            If a campaign is pending too long, payment fails, or rejection spikes, the business notifications page surfaces it as an active alert.
          </div>
        </section>
      </div>
    </div>
  );
}

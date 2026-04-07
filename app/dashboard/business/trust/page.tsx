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
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Business trust layer</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("trustPageTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
          Commercial terms, review flow, safety controls, and service timing in one business-facing page.
        </p>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 via-background/80 to-sky-500/10 p-4 shadow-[0_30px_100px_-52px_rgba(16,185,129,0.35)] backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-700/80 dark:text-emerald-200/70">Wallet pricing</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Business wallet fee structure</h3>
              <p className="mt-2 max-w-2xl text-sm text-foreground/65">
                Top-ups stay free during launch, while approved refund requests use the refund fee shown below.
              </p>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
              Launch model
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-300/15 bg-background/60 p-4 shadow-inner shadow-emerald-400/5 sm:p-5">
              <p className="text-sm text-foreground/60">Add-fund fee</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{(settings.fundingFeeRate * 100).toFixed(2)}%</p>
              <p className="mt-2 text-xs text-foreground/45">Applied on wallet top-ups. Currently waived during launch.</p>
              <p className="mt-4 inline-flex rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                Best for recharging budget
              </p>
            </div>
            <div className="rounded-3xl border border-cyan-400/15 bg-cyan-500/10 p-4 shadow-inner shadow-cyan-400/5 sm:p-5">
              <p className="text-sm text-cyan-800/80 dark:text-cyan-100/80">Refund fee</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {(settings.businessRefundFeeRate * 100).toFixed(2)}%
              </p>
              <p className="mt-2 text-xs text-cyan-800/70 dark:text-cyan-50/70">Applied only when a business refund request is approved.</p>
              <p className="mt-4 inline-flex rounded-full border border-cyan-300/15 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-100/80">
                Used for reviewed refunds
              </p>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-background/60 p-4 sm:col-span-2 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">How to read these wallet fees</p>
                  <p className="mt-1 text-sm text-foreground/60">
                    Add-fund pricing helps you top up campaigns, while refund pricing applies only when an approved refund is sent back out.
                  </p>
                </div>
                <div className="rounded-full border border-foreground/10 bg-background/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/55">
                  Business wallet rules
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-5">
            <p className="text-sm text-foreground/60">Locked campaign budget</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">INR {formatMoney(lockedBudget)}</p>
            <p className="mt-2 text-xs text-foreground/45">Budget reserved across pending, approved, and live campaigns.</p>
          </div>
          <div className="rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-5">
            <p className="text-sm text-foreground/60">Avg manager review time</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{formatHours(avgManagerHours)}</p>
            <p className="mt-2 text-xs text-foreground/45">Based on recent submissions reviewed by managers.</p>
          </div>
          <div className="rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-5">
            <p className="text-sm text-foreground/60">Avg admin final review time</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{formatHours(avgAdminHours)}</p>
            <p className="mt-2 text-xs text-foreground/45">Measured from submission creation to final admin decision.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">Commercial model</p>
            <h3 className="text-xl font-semibold text-foreground">How money moves</h3>
          </div>
          <div className="space-y-3 text-sm text-foreground/70">
            <p>Campaign creation locks the full budget immediately from the business wallet.</p>
            <p>On final admin approval, the full per-task reward is deducted from campaign remaining budget.</p>
            <p>User payout and platform commission are split internally after approval. Businesses are charged only from campaign budget, not an extra approval fee.</p>
            <p>Campaign edit budget increases deduct only the difference. Budget reductions release unused budget back to the business wallet.</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/60">
            <p>Total campaign budget launched so far: INR {formatMoney(totalCampaignBudget)}</p>
            <p className="mt-2">
              Recent payment health: {successfulPayments.length} paid, {failedPayments.length} failed orders.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">Review steps</p>
            <h3 className="text-xl font-semibold text-foreground">What happens after your campaign goes live</h3>
          </div>
          <ol className="space-y-3 text-sm text-foreground/70">
            <li>1. Business creates the campaign and budget is reserved.</li>
            <li>2. Admin reviews the campaign before it can go live.</li>
            <li>3. Users submit proof against live campaigns only.</li>
            <li>4. Manager performs the first moderation pass.</li>
            <li>5. Admin makes the final approval or rejection decision.</li>
            <li>6. On approval, wallet credit and platform commission are recorded atomically.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Waiting for first review</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{managerPending}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Waiting for final approval</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{adminPending}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">Fraud and safety controls</p>
            <h3 className="text-xl font-semibold text-foreground">What protects campaign quality</h3>
          </div>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li>Submission access is restricted to live campaigns with available budget.</li>
            <li>Proof passes through manager review and final admin review before payout.</li>
            <li>IP logging and suspicious-user monitoring support abuse detection.</li>
            <li>Wallet ledger entries and activity logs preserve a visible financial and moderation trail.</li>
            <li>Notification events are created on approval, rejection, and funding changes.</li>
          </ul>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/60">
            <p>Current final rejection rate: {rejectionRate.toFixed(1)}%</p>
            <p className="mt-2">Approved submissions: {approvedSubmissions}</p>
            <p className="mt-2">Rejected submissions: {rejectedSubmissions}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">Service timing and status</p>
            <h3 className="text-xl font-semibold text-foreground">Current review status</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Pending campaign approvals</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{pendingCampaigns.length}</p>
              <p className="mt-1 text-xs text-foreground/45">{delayedPendingCampaigns.length} older than 24 hours</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Failed funding payments</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{failedPayments.length}</p>
              <p className="mt-1 text-xs text-foreground/45">Recent failed orders needing retry or review</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Live campaigns at zero budget</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{exhaustedCampaigns.length}</p>
              <p className="mt-1 text-xs text-foreground/45">Top-up or close these campaigns to avoid dead traffic</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Processing guidance</p>
              <p className="mt-2 text-lg font-semibold text-foreground">24h target</p>
              <p className="mt-1 text-xs text-foreground/45">Target time for campaign review and monitoring</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/60 p-4 text-sm text-foreground/60">
            If a campaign is pending too long, payment fails, or rejection spikes, the business notifications page surfaces it as an active alert.
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AlertTriangle, ArrowRight, CircleDollarSign, Layers3, Megaphone, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type OverviewResponse = {
  accessRole: "OWNER" | "EDITOR" | "VIEWER";
  wallet: { balance: number; totalFunded: number; totalSpent: number; totalRefund: number };
  lowBalanceThreshold: number;
  lowBalance: boolean;
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  completedCampaigns: number;
  lockedBudget: number;
  totalBudget: number;
  remainingBudget: number;
  spentBudget: number;
  approvedSubmissions: number;
  pendingReviews: number;
  todaySpend: number;
  averageCostPerApproval: number;
  fundingFeeRate: number;
  activityFeed: Array<{
    id: string;
    kind: "CAMPAIGN" | "APPROVAL" | "WALLET";
    message: string;
    createdAt: string;
  }>;
  error?: string;
};

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function relativeTimeLabel(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function BusinessOverviewPanel() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/overview", { credentials: "include" });
    const raw = await res.text();
    let parsed: OverviewResponse = {
      wallet: { balance: 0, totalFunded: 0, totalSpent: 0, totalRefund: 0 },
      accessRole: "OWNER",
      lowBalanceThreshold: 500,
      lowBalance: false,
      totalCampaigns: 0,
      liveCampaigns: 0,
      pendingCampaigns: 0,
      completedCampaigns: 0,
      lockedBudget: 0,
      totalBudget: 0,
      remainingBudget: 0,
      spentBudget: 0,
      approvedSubmissions: 0,
      pendingReviews: 0,
      todaySpend: 0,
      averageCostPerApproval: 0,
      fundingFeeRate: 0,
      activityFeed: [],
    };
    try {
      parsed = raw ? (JSON.parse(raw) as OverviewResponse) : parsed;
    } catch {
      setError("Unexpected server response");
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load overview");
      return;
    }
    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading business overview...</p>;

  const deploymentRate = percentage(data.spentBudget, data.totalBudget);
  const walletUsageRate = percentage(data.lockedBudget, data.wallet.balance + data.lockedBudget);
  const liveCampaignRate = percentage(data.liveCampaigns, data.totalCampaigns);
  const canManageBilling = data.accessRole === "OWNER";
  const canManageCampaigns = data.accessRole === "OWNER" || data.accessRole === "EDITOR";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business control center</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Business Overview</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
            Track available cash, locked campaign budget, campaign health, and the next action required
            without opening five separate screens.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canManageBilling ? (
            <Link
              href="/dashboard/business/funding"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 sm:w-auto"
            >
              <Wallet size={16} />
              Add Funds
            </Link>
          ) : null}
          {canManageCampaigns ? (
            <Link
              href="/dashboard/business/create"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 sm:w-auto"
            >
              <Megaphone size={16} />
              Create Campaign
            </Link>
          ) : null}
        </div>
      </div>

      {data.lowBalance ? (
        <Card className="rounded-3xl border-amber-400/20 bg-amber-500/10 shadow-xl shadow-amber-950/20 backdrop-blur-md">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-semibold text-amber-100">Low wallet balance</p>
                <p className="text-sm text-amber-100/75">
                  Available balance is below INR {formatMoney(data.lowBalanceThreshold)}. New campaigns or budget
                  top-ups may fail until you add funds.
                </p>
              </div>
            </div>
            {canManageBilling ? (
              <Link
                href="/dashboard/business/funding"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200/20 bg-black/20 px-4 py-2 text-sm text-amber-50 transition hover:bg-black/30"
              >
                Top up wallet
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Available wallet</p>
              <Wallet size={18} className="text-emerald-300" />
            </div>
            <p className="text-3xl font-semibold text-emerald-300">INR {formatMoney(data.wallet.balance)}</p>
            <p className="text-xs text-white/55">
              Total funded INR {formatMoney(data.wallet.totalFunded)} | Refunds INR{" "}
              {formatMoney(data.wallet.totalRefund)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Locked campaign budget</p>
              <Layers3 size={18} className="text-sky-300" />
            </div>
            <p className="text-3xl font-semibold text-sky-300">INR {formatMoney(data.lockedBudget)}</p>
            <p className="text-xs text-white/55">
              {walletUsageRate}% of all available + locked capital is currently committed to campaigns.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Campaign status</p>
              <Megaphone size={18} className="text-violet-300" />
            </div>
            <p className="text-3xl font-semibold text-violet-200">{data.liveCampaigns} live</p>
            <p className="text-xs text-white/55">
              {data.pendingCampaigns} pending | {data.completedCampaigns} completed | {data.totalCampaigns} total
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Approved results</p>
              <CircleDollarSign size={18} className="text-amber-300" />
            </div>
            <p className="text-3xl font-semibold text-white">{data.approvedSubmissions}</p>
            <p className="text-xs text-white/55">
              Avg cost per approval INR {formatMoney(data.averageCostPerApproval)} | Pending review{" "}
              {data.pendingReviews}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Performance snapshot</p>
                <h3 className="text-xl font-semibold text-white">Spend and campaign health</h3>
              </div>
              <Link
                href="/dashboard/business/analytics"
                className="text-sm text-emerald-200 transition hover:text-emerald-100"
              >
                Open analytics
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Today spend</p>
                <p className="mt-2 text-2xl font-semibold text-white">INR {formatMoney(data.todaySpend)}</p>
                <p className="mt-1 text-xs text-white/55">Based on admin-approved results posted today.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Spent so far</p>
                <p className="mt-2 text-2xl font-semibold text-white">INR {formatMoney(data.spentBudget)}</p>
                <p className="mt-1 text-xs text-white/55">Actual approved spend against campaign budgets.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Funding fee</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {(data.fundingFeeRate * 100).toFixed(2)}%
                </p>
                <p className="mt-1 text-xs text-white/55">Applied on business wallet deposits and refunds.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                  <span>Budget deployment</span>
                  <span>{deploymentRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${deploymentRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-white/50">
                  INR {formatMoney(data.spentBudget)} spent from INR {formatMoney(data.totalBudget)} allocated.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                  <span>Live campaign share</span>
                  <span>{liveCampaignRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-sky-400" style={{ width: `${liveCampaignRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {data.liveCampaigns} of {data.totalCampaigns} campaigns are currently live.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Recent activity</p>
                <h3 className="text-xl font-semibold text-white">What changed most recently</h3>
              </div>
              <Link
                href="/dashboard/business/campaigns"
                className="text-sm text-emerald-200 transition hover:text-emerald-100"
              >
                View campaigns
              </Link>
            </div>

            {data.activityFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                No business activity yet. Fund the wallet or launch your first campaign to start the timeline.
              </div>
            ) : (
              <div className="space-y-3">
                {data.activityFeed.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <p className="text-sm font-medium text-white/90 break-words">{item.message}</p>
                      <span className="shrink-0 text-xs text-white/45">{relativeTimeLabel(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{item.kind}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

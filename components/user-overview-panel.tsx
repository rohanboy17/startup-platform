"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Sparkles, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type OverviewResponse = {
  profile: {
    displayName: string;
    level: "L1" | "L2" | "L3" | "L4" | "L5";
    balance: number;
    coinBalance: number;
    totalApproved: number;
    dailySubmits: number;
  };
  metrics: {
    availableBalance: number;
    coinBalance: number;
    pendingWithdrawalAmount: number;
    totalWithdrawn: number;
    approvedSubmissions: number;
    todayApprovedCount: number;
    unreadNotifications: number;
  };
  progress: {
    current: number;
    target: number | null;
    percent: number;
  };
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    kind: string;
    message: string;
    createdAt: string;
  }>;
  error?: string;
};

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

export default function UserOverviewPanel() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/overview", { credentials: "include" });
    const raw = await res.text();
    let parsed: OverviewResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as OverviewResponse) : null;
    } catch {
      setError("Unexpected server response");
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load overview");
      return;
    }

    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading user overview...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Daily earning center</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">User Overview</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
            Track your balance, approvals, withdrawal status, and current level without switching between tabs.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/user/tasks"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 sm:w-auto"
          >
            <Sparkles size={16} />
            Find Tasks
          </Link>
          <Link
            href="/dashboard/user/withdrawals"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 sm:w-auto"
          >
            <Wallet size={16} />
            Withdraw
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Available balance"
          value={`INR ${formatMoney(data.metrics.availableBalance)}`}
          tone="success"
        />

        <KpiCard
          label="EarnHub Coins"
          value={data.metrics.coinBalance}
          tone="info"
        />

        <KpiCard
          label="Pending withdrawal"
          value={`INR ${formatMoney(data.metrics.pendingWithdrawalAmount)}`}
          tone="warning"
        />

        <KpiCard
          label="Total withdrawn"
          value={`INR ${formatMoney(data.metrics.totalWithdrawn)}`}
          tone="info"
        />

        <KpiCard
          label="Approved submissions"
          value={data.metrics.approvedSubmissions}
        />

        <KpiCard
          label="Current level"
          value={data.profile.level}
          tone="info"
        />

        <KpiCard
          label="Unread notifications"
          value={data.metrics.unreadNotifications}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 min-[1600px]:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/60">Level progress</p>
                <h3 className="text-xl font-semibold text-white">Keep approvals moving</h3>
              </div>
              <Link href="/dashboard/user/submissions" className="text-sm text-emerald-200 transition hover:text-emerald-100">
                View submissions
              </Link>
            </div>

            <div className="grid gap-4 min-[1400px]:grid-cols-[1fr_auto] min-[1400px]:items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Level now</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{data.profile.level}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {data.progress.target === null
                      ? `Top tier unlocked with ${data.progress.current} approved submissions.`
                      : `${data.progress.current} approved so far. Reach ${data.progress.target} to move up.`}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                    <span>Progress to next level</span>
                    <span>{data.progress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${data.progress.percent}%` }} />
                  </div>
                </div>
              </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Today approved</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{data.metrics.todayApprovedCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Total approved</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{data.profile.totalApproved}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Submitted today</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{data.profile.dailySubmits}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/dashboard/user/tasks" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/30 hover:bg-black/30">
                <p className="text-sm font-medium text-white">Open tasks</p>
                <p className="mt-1 text-sm text-white/55">Find available campaigns with open slots.</p>
              </Link>
              <Link href="/dashboard/user/wallet" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/30 hover:bg-black/30">
                <p className="text-sm font-medium text-white">Open wallet</p>
                <p className="mt-1 text-sm text-white/55">Review credits, debits, and payout history.</p>
              </Link>
              <Link href="/dashboard/user/notifications" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/30 hover:bg-black/30">
                <p className="text-sm font-medium text-white">Open notifications</p>
                <p className="mt-1 text-sm text-white/55">Check approval, rejection, and payout updates.</p>
              </Link>
              <Link href="/dashboard/user/referrals" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/30 hover:bg-black/30">
                <p className="text-sm font-medium text-white">Open referrals</p>
                <p className="mt-1 text-sm text-white/55">Share your code, earn coins, and redeem them to wallet.</p>
              </Link>
            </div>
        </SectionCard>

        <div className="space-y-6">
          <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Recent notifications</p>
                  <h3 className="text-xl font-semibold text-white">What needs your attention</h3>
                </div>
                <Link href="/dashboard/user/notifications" className="text-sm text-emerald-200 transition hover:text-emerald-100">
                  Open inbox
                </Link>
              </div>

              {data.recentNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                  No notifications yet. Approval and withdrawal updates will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentNotifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-white break-words">{item.title}</p>
                        <span className="shrink-0 text-xs text-white/45">{relativeTimeLabel(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/65 break-words">{item.message}</p>
                      {!item.isRead ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300">Unread</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Recent activity</p>
                  <h3 className="text-xl font-semibold text-white">Latest balance and submission changes</h3>
                </div>
                <Link href="/dashboard/user/wallet" className="text-sm text-emerald-200 transition hover:text-emerald-100">
                  Wallet details
                </Link>
              </div>

              {data.recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                  No activity yet. Complete a task or request a withdrawal to populate the timeline.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((item) => (
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
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { Coins, Copy, Gift, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

type ReferralsResponse = {
  settings: {
    referralRewardCoins: number;
    newUserBonusCoins: number;
    redeemMinCoins: number;
    redeemMonthlyLimit: number;
    coinToInrRate: number;
  };
  summary: {
    coinBalance: number;
    totalInvites: number;
    rewardedInvites: number;
    pendingInvites: number;
    monthlyRedeemedCoins: number;
  };
  referral: {
    code: string;
    link: string;
  };
  invites: Array<{
    id: string;
    status: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED";
    createdAt: string;
    qualifiedAt: string | null;
    rewardedAt: string | null;
    referredUser: {
      id: string;
      name: string;
      createdAt: string;
    };
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    source: string;
    note: string | null;
    createdAt: string;
  }>;
  error?: string;
};

function statusTone(status: ReferralsResponse["invites"][number]["status"]) {
  if (status === "REWARDED") return "text-emerald-700 dark:text-emerald-300";
  if (status === "PENDING") return "text-amber-800 dark:text-amber-200";
  if (status === "REJECTED") return "text-rose-600 dark:text-rose-300";
  return "text-sky-700 dark:text-sky-200";
}

export default function UserReferralsPanel() {
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [redeemCoins, setRedeemCoins] = useState("");
  const hydrated = useHydrated();

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/referrals", { credentials: "include" });
    const raw = await res.text();
    let parsed: ReferralsResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as ReferralsResponse) : null;
    } catch {
      setError("Unexpected server response");
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load referrals");
      return;
    }

    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  const estimatedWalletValue = useMemo(() => {
    if (!data) return 0;
    return Number((data.summary.coinBalance * data.settings.coinToInrRate).toFixed(2));
  }, [data]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback("Copied to clipboard");
    } catch {
      setFeedback("Unable to copy automatically");
    }
  }

  async function redeem() {
    const coins = Number(redeemCoins || 0);
    setLoading("redeem");
    setFeedback("");
    const res = await fetch("/api/v2/users/me/referrals/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ coins }),
    });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string; walletAmount?: number }) : {};
    setLoading(null);
    if (!res.ok) {
      setFeedback(parsed.error || "Redemption failed");
      return;
    }

    setRedeemCoins("");
    setFeedback(parsed.message || "Coins redeemed");
    await load();
  }

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">Loading referrals...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Referral rewards</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Coins and referrals</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
            Invite new users, unlock EarnHub Coins after their first approved submission, and redeem coins into wallet value.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Coin balance" value={data.summary.coinBalance} tone="info" />
        <KpiCard label="Estimated wallet value" value={`INR ${formatMoney(estimatedWalletValue)}`} tone="success" />
        <KpiCard label="Total invites" value={data.summary.totalInvites} />
        <KpiCard label="Rewarded invites" value={data.summary.rewardedInvites} tone="success" />
        <KpiCard label="Pending invites" value={data.summary.pendingInvites} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-sm text-white/60">Your referral code</p>
            <h3 className="text-xl font-semibold text-white">Share this with new users</h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Referral code</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.referral.code}</p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" onClick={() => void copyText(data.referral.code)}>
                <Copy size={16} />
                Copy code
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Referral link</p>
              <p className="mt-2 break-all text-sm text-white/75">{data.referral.link}</p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" onClick={() => void copyText(data.referral.link)}>
                <Gift size={16} />
                Copy link
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Referrer reward</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.settings.referralRewardCoins} coins</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">New user bonus</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.settings.newUserBonusCoins} coins</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Reward trigger</p>
              <p className="mt-2 text-sm text-white/75">First admin-approved submission</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">Redeem coins</p>
            <h3 className="text-xl font-semibold text-foreground">Convert coins into wallet balance</h3>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-foreground">
              <Coins size={16} className="text-amber-700 dark:text-amber-200" />
              <p className="font-medium">Current rules</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/70">
              <li>Minimum redeem: {data.settings.redeemMinCoins} coins</li>
              <li>Monthly limit: {data.settings.redeemMonthlyLimit} coins</li>
              <li>Conversion rate: 1 coin = INR {data.settings.coinToInrRate.toFixed(2)}</li>
              <li>Redeemed this month: {data.summary.monthlyRedeemedCoins} coins</li>
            </ul>
          </div>

          <div className="space-y-3">
            <input
              value={redeemCoins}
              onChange={(e) => setRedeemCoins(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={`Enter coins (min ${data.settings.redeemMinCoins})`}
              className="h-11 w-full rounded-xl border border-foreground/20 bg-background/60 px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Button onClick={redeem} disabled={loading !== null} className="w-full sm:w-auto">
              <Wallet size={16} />
              {loading === "redeem" ? "Redeeming..." : "Redeem Coins"}
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">Referral history</p>
              <h3 className="text-xl font-semibold text-foreground">Users you invited</h3>
            </div>

            {data.invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                No referrals yet. Share your code to start earning coins.
              </div>
            ) : (
              <div className="space-y-3">
                {data.invites.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{item.referredUser.name}</p>
                      <span className={`text-xs font-medium uppercase tracking-[0.18em] ${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/60" suppressHydrationWarning>
                      Joined {hydrated ? new Date(item.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">Coin activity</p>
              <h3 className="text-xl font-semibold text-foreground">Credits and redemptions</h3>
            </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                No coin transactions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{item.note || item.source}</p>
                      <span className={item.type === "CREDIT" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}>
                        {item.type === "CREDIT" ? "+" : "-"}
                        {item.amount} coins
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/60" suppressHydrationWarning>
                      {hydrated ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {feedback ? <p className="text-sm text-foreground/70">{feedback}</p> : null}
    </div>
  );
}

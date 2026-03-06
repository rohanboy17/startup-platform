"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type OverviewResponse = {
  wallet: { balance: number; totalFunded: number; totalSpent: number; totalRefund: number };
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  error?: string;
};

export default function BusinessOverviewPanel() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/overview", { credentials: "include" });
    const raw = await res.text();
    let parsed: OverviewResponse = {
      wallet: { balance: 0, totalFunded: 0, totalSpent: 0, totalRefund: 0 },
      totalCampaigns: 0,
      liveCampaigns: 0,
      pendingCampaigns: 0,
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

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Business Overview</h2>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Wallet Balance</p>
            <h2 className="mt-2 text-3xl font-bold text-green-400">
              INR {formatMoney(data.wallet.balance)}
            </h2>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Total Campaigns</p>
            <h2 className="mt-2 text-3xl font-bold">{data.totalCampaigns}</h2>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Live / Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-400">
              {data.liveCampaigns} / {data.pendingCampaigns}
            </h2>
          </CardContent>
        </Card>
      </div>
      <div>
        <Link
          href="/dashboard/business/funding"
          className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Add Wallet Funds
        </Link>
      </div>
    </div>
  );
}

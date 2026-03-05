"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";

type Analytics = {
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  approvedSubmissions: number;
  totalBudget: number;
  remainingBudget: number;
  error?: string;
};

export default function BusinessAnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v2/business/analytics", { credentials: "include" });
      const raw = await res.text();
      let parsed: Analytics = {
        totalCampaigns: 0,
        liveCampaigns: 0,
        pendingCampaigns: 0,
        approvedSubmissions: 0,
        totalBudget: 0,
        remainingBudget: 0,
      };
      try {
        parsed = raw ? (JSON.parse(raw) as Analytics) : parsed;
      } catch {
        setError("Unexpected server response");
        return;
      }
      if (!res.ok) {
        setError(parsed.error || "Failed to load analytics");
        return;
      }
      setData(parsed);
    }
    void load();
  }, []);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading analytics...</p>;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-6">
          <p className="text-white/60">Total Campaigns</p>
          <h3 className="mt-2 text-3xl font-bold">{data.totalCampaigns}</h3>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-6">
          <p className="text-white/60">Live / Pending</p>
          <h3 className="mt-2 text-3xl font-bold text-blue-400">
            {data.liveCampaigns} / {data.pendingCampaigns}
          </h3>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-6">
          <p className="text-white/60">Remaining Budget</p>
          <h3 className="mt-2 text-3xl font-bold text-green-400">
            INR {formatMoney(data.remainingBudget)}
          </h3>
          <p className="mt-2 text-xs text-white/60">
            Total Budget: INR {formatMoney(data.totalBudget)} | Approved Submissions:{" "}
            {data.approvedSubmissions}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

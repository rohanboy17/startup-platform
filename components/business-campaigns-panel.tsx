"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";

type Campaign = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";
  totalBudget: number;
  remainingBudget: number;
  _count: { submissions: number };
};

export default function BusinessCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v2/business/campaigns", { credentials: "include" });
      const raw = await res.text();
      let data: { campaigns?: Campaign[]; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { campaigns?: Campaign[]; error?: string }) : {};
      } catch {
        setError("Unexpected server response");
        setLoading(false);
        return;
      }
      if (!res.ok) setError(data.error || "Failed to load campaigns");
      else setCampaigns(data.campaigns || []);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) return <p className="text-sm text-white/60">Loading campaigns...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {campaigns.length === 0 ? (
        <div className="py-20 text-center text-white/50 md:col-span-2">No campaigns created yet.</div>
      ) : (
        campaigns.map((campaign) => {
          const spent = campaign.totalBudget - campaign.remainingBudget;
          const progress =
            campaign.totalBudget > 0
              ? Math.min(100, Math.round((spent / campaign.totalBudget) * 100))
              : 0;

          return (
            <Card key={campaign.id} className="rounded-2xl border-white/10 bg-white/5 transition hover:scale-[1.02]">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-xl font-semibold">{campaign.title}</h3>
                <p className="text-sm text-white/60">{campaign.description}</p>
                <div className="flex justify-between text-sm">
                  <span>Status: {campaign.status}</span>
                  <span>Budget Left: INR {formatMoney(campaign.remainingBudget)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Budget Consumption</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-white/50">
                    Spent INR {formatMoney(spent)} of INR {formatMoney(campaign.totalBudget)} |
                    Submissions: {campaign._count.submissions}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

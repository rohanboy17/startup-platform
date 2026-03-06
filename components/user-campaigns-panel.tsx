"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SubmitCampaignModal from "@/components/submit-campaign-modal";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type Campaign = {
  id: string;
  title: string;
  description: string;
  category: string;
  taskLink: string | null;
  rewardPerTask: number;
  remainingBudget: number;
  totalBudget: number;
  allowedSubmissions: number;
  usedSubmissions: number;
  leftSubmissions: number;
};

export default function UserCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/campaigns", { credentials: "include" });
    const raw = await res.text();
    let data: { campaigns?: Campaign[]; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { campaigns?: Campaign[]; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    if (!res.ok) {
      setError(data.error || "Failed to load campaigns");
    } else {
      setError("");
      setCampaigns(data.campaigns || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  if (loading) {
    return <p className="text-sm text-white/60">Loading campaigns...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {campaigns.length === 0 ? (
        <div className="py-20 text-center text-white/50 md:col-span-2">No live campaigns right now.</div>
      ) : (
        campaigns.map((campaign) => {
          return (
            <Card
              key={campaign.id}
              className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-[1.02] hover:shadow-xl hover:ring-1 hover:ring-white/20"
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{campaign.title}</h3>
                  <span className="text-xs text-white/60">{campaign.category}</span>
                </div>
                <p className="text-sm text-white/60">{campaign.description}</p>
                {campaign.taskLink ? (
                  <a
                    href={campaign.taskLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-300 underline"
                  >
                    Open task link
                  </a>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-green-400">
                    INR {formatMoney(campaign.rewardPerTask)}
                  </span>
                  <span className="text-xs text-white/60">
                    Budget left: INR {formatMoney(campaign.remainingBudget)}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Allowed: {campaign.allowedSubmissions}
                  <span className="mx-1 hidden sm:inline">|</span>
                  <span className="block sm:inline">Used: {campaign.usedSubmissions}</span>
                  <span className="mx-1 hidden sm:inline">|</span>
                  <span className="block sm:inline">Slots Left: {campaign.leftSubmissions}</span>
                </p>
                <SubmitCampaignModal campaignId={campaign.id} />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { normalizeExternalUrl } from "@/lib/external-url";
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
  userSubmissionCount: number;
  blockedBySubmissionMode: boolean;
  submissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
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
    <div className="grid gap-4 lg:grid-cols-2">
      {campaigns.length === 0 ? (
        <div className="py-20 text-center text-white/50 md:col-span-2">No live campaigns right now.</div>
      ) : (
        campaigns.map((campaign) => {
          return (
            <Card
              key={campaign.id}
              className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-[1.02] hover:shadow-xl hover:ring-1 hover:ring-white/20"
            >
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold sm:text-xl">{campaign.title}</h3>
                  <span className="text-xs text-white/60">{campaign.category}</span>
                </div>
                <p className="text-sm text-white/60">{campaign.description}</p>
                {campaign.taskLink ? (
                  <a
                    href={normalizeExternalUrl(campaign.taskLink) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-300 underline"
                  >
                    Open task link
                  </a>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-bold text-green-400">
                    INR {formatMoney(campaign.rewardPerTask)}
                  </span>
                  <span className="text-xs text-white/60 sm:text-right">
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
                <p className="text-xs text-white/60">
                  {campaign.submissionMode === "ONE_PER_USER"
                    ? "One submission per user"
                    : "Many submissions per user"}
                </p>
                {campaign.blockedBySubmissionMode ? (
                  <p className="text-xs text-amber-200">
                    You already used your one allowed submission for this campaign.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/dashboard/user/tasks/${campaign.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
                  >
                    View Task
                  </Link>
                  <Link
                    href={`/dashboard/user/tasks/${campaign.id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
                      campaign.blockedBySubmissionMode
                        ? "border border-white/10 bg-white/5 text-white/45"
                        : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                    }`}
                  >
                    {campaign.blockedBySubmissionMode ? "Already Submitted" : "Start Task"}
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

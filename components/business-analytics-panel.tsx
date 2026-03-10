"use client";

import { useCallback, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type Analytics = {
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalSubmissions: number;
  approvalRate: number;
  totalBudget: number;
  remainingBudget: number;
  spentBudget: number;
  averageCostPerApproval: number;
  trend: Array<{
    day: string;
    submissions: number;
    approved: number;
    rejected: number;
    spend: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    campaigns: number;
    approved: number;
    rejected: number;
    spend: number;
    approvalRate: number;
  }>;
  topCampaigns: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    totalBudget: number;
    remainingBudget: number;
    submissions: number;
    approved: number;
    rejected: number;
    pending: number;
    spent: number;
    approvalRate: number;
    costPerApproved: number;
  }>;
  error?: string;
};

const trendChartConfig = {
  spend: { label: "Spend", color: "#10b981" },
  approved: { label: "Approved", color: "#38bdf8" },
  submissions: { label: "Submissions", color: "#a78bfa" },
} as const;

const moderationChartConfig = {
  approved: { label: "Approved", color: "#10b981" },
  rejected: { label: "Rejected", color: "#fb7185" },
} as const;

export default function BusinessAnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/analytics", { credentials: "include" });
    const raw = await res.text();
    let parsed: Analytics = {
      totalCampaigns: 0,
      liveCampaigns: 0,
      pendingCampaigns: 0,
      approvedSubmissions: 0,
      rejectedSubmissions: 0,
      totalSubmissions: 0,
      approvalRate: 0,
      totalBudget: 0,
      remainingBudget: 0,
      spentBudget: 0,
      averageCostPerApproval: 0,
      trend: [],
      categoryPerformance: [],
      topCampaigns: [],
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
    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Approved results</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-200">{data.approvedSubmissions}</p>
            <p className="mt-1 text-xs text-white/45">{data.liveCampaigns} live campaigns currently driving results.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Approval rate</p>
            <p className="mt-2 text-3xl font-semibold text-sky-200">{data.approvalRate.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-white/45">
              {data.rejectedSubmissions} rejected out of {data.totalSubmissions} total submissions.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Spent budget</p>
            <p className="mt-2 text-3xl font-semibold text-white">INR {formatMoney(data.spentBudget)}</p>
            <p className="mt-1 text-xs text-white/45">
              Remaining INR {formatMoney(data.remainingBudget)} from allocated INR {formatMoney(data.totalBudget)}.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Cost per approved</p>
            <p className="mt-2 text-3xl font-semibold text-violet-200">
              INR {formatMoney(data.averageCostPerApproval)}
            </p>
            <p className="mt-1 text-xs text-white/45">{data.pendingCampaigns} campaigns are still waiting for review.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">14-day trend</p>
              <h3 className="text-xl font-semibold text-white">Spend vs approved output</h3>
            </div>
            <ChartContainer config={trendChartConfig} className="aspect-auto h-[220px] w-full overflow-hidden sm:h-[320px]">
              <LineChart data={data.trend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent className="hidden sm:flex text-[11px] sm:text-xs" />} />
                <Line type="monotone" dataKey="approved" stroke="var(--color-approved)" strokeWidth={3} dot={false} />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="var(--color-submissions)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area type="monotone" dataKey="spend" fill="var(--color-spend)" fillOpacity={0.18} stroke="var(--color-spend)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Category performance</p>
              <h3 className="text-xl font-semibold text-white">Which task type is working</h3>
            </div>

            {data.categoryPerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                No category analytics yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.categoryPerformance.map((row) => (
                  <div key={row.category} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-white">{getCampaignCategoryLabel(row.category)}</p>
                      <span className="text-sm text-emerald-200">{row.approvalRate.toFixed(2)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {row.campaigns} campaigns | {row.approved} approved | {row.rejected} rejected
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.max(0, Math.min(100, row.approvalRate))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/45">Spend INR {formatMoney(row.spend)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Moderation flow</p>
              <h3 className="text-xl font-semibold text-white">Approved vs rejected volume</h3>
            </div>
            <ChartContainer config={moderationChartConfig} className="aspect-auto h-[210px] w-full overflow-hidden sm:h-[280px]">
              <BarChart data={data.trend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent className="hidden sm:flex text-[11px] sm:text-xs" />} />
                <Bar dataKey="approved" fill="var(--color-approved)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="var(--color-rejected)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Top campaigns</p>
              <h3 className="text-xl font-semibold text-white">Ranking by approved output</h3>
            </div>
            {data.topCampaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                No campaign ranking available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.topCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="break-words font-medium text-white">{campaign.title}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {getCampaignCategoryLabel(campaign.category)} | {campaign.status}
                        </p>
                      </div>
                      <span className="text-sm text-emerald-200">{campaign.approved} approved</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                      <p>Approval rate: {campaign.approvalRate.toFixed(2)}%</p>
                      <p>Cost per approved: INR {formatMoney(campaign.costPerApproved)}</p>
                      <p>Spent: INR {formatMoney(campaign.spent)}</p>
                      <p>Pending: {campaign.pending}</p>
                    </div>
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

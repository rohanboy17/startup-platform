"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Area, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CAMPAIGN_CATEGORY_OPTIONS, getCampaignCategoryLabel, type CampaignCategoryOption } from "@/lib/campaign-options";
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

export default function BusinessAnalyticsPanel() {
  const t = useTranslations("business.analyticsPanel");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [campaignCategoryOptions, setCampaignCategoryOptions] = useState<CampaignCategoryOption[]>(CAMPAIGN_CATEGORY_OPTIONS);

  const trendChartConfig = {
    spend: { label: t("charts.trend.spend"), color: "#10b981" },
    approved: { label: t("charts.trend.approved"), color: "#38bdf8" },
    submissions: { label: t("charts.trend.submissions"), color: "#a78bfa" },
  } as const;

  const moderationChartConfig = {
    approved: { label: t("charts.moderation.approved"), color: "#10b981" },
    rejected: { label: t("charts.moderation.rejected"), color: "#fb7185" },
  } as const;

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
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoadAnalytics"));
      return;
    }
    setError("");
    setData(parsed);
  }, [t]);

  useLiveRefresh(load, 10000);

  useEffect(() => {
    let active = true;
    async function loadTaxonomy() {
      const res = await fetch("/api/work-taxonomy", { cache: "no-store" });
      const raw = await res.text();
      if (!active) return;
      try {
        const parsed = raw ? (JSON.parse(raw) as { campaignCategoryOptions?: CampaignCategoryOption[] }) : {};
        if (parsed.campaignCategoryOptions?.length) {
          setCampaignCategoryOptions(parsed.campaignCategoryOptions);
        }
      } catch {
        // keep fallback options
      }
    }
    void loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.approvedResults")} value={data.approvedSubmissions} tone="success" />
        <KpiCard label={t("kpis.approvalRate")} value={`${data.approvalRate.toFixed(2)}%`} tone="info" />
        <KpiCard label={t("kpis.spentBudget")} value={`INR ${formatMoney(data.spentBudget)}`} />
        <KpiCard label={t("kpis.costPerApproved")} value={`INR ${formatMoney(data.averageCostPerApproval)}`} tone="warning" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard elevated>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("trend.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("trend.title")}</h3>
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
        </SectionCard>

        <SectionCard elevated>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("categories.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("categories.title")}</h3>
            </div>

            {data.categoryPerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-4 text-sm text-foreground/60">
                {t("categories.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.categoryPerformance.map((row) => (
                  <div key={row.category} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">
                        {getCampaignCategoryLabel(row.category, undefined, campaignCategoryOptions)}
                      </p>
                      <StatusBadge label={`${row.approvalRate.toFixed(2)}%`} tone="success" />
                    </div>
                    <p className="mt-1 text-xs text-foreground/60">
                      {t("categories.rowSummary", {
                        campaigns: row.campaigns,
                        approved: row.approved,
                        rejected: row.rejected,
                      })}
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-foreground/10">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.max(0, Math.min(100, row.approvalRate))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-foreground/60">{t("categories.spend", { amount: formatMoney(row.spend) })}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SectionCard>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("moderation.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("moderation.title")}</h3>
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

        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("topCampaigns.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("topCampaigns.title")}</h3>
            </div>
            {data.topCampaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-4 text-sm text-foreground/60">
                {t("topCampaigns.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.topCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="break-words font-medium text-foreground">{campaign.title}</p>
                        <p className="mt-1 text-xs text-foreground/60">
                          {getCampaignCategoryLabel(campaign.category, undefined, campaignCategoryOptions)} | {campaign.status}
                        </p>
                      </div>
                      <span className="text-sm text-emerald-700 dark:text-emerald-200">
                        {t("topCampaigns.approvedCount", { count: campaign.approved })}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-foreground/70 sm:grid-cols-2">
                      <p>{t("topCampaigns.approvalRate", { value: campaign.approvalRate.toFixed(2) })}</p>
                      <p>{t("topCampaigns.costPerApproved", { amount: formatMoney(campaign.costPerApproved) })}</p>
                      <p>{t("topCampaigns.spent", { amount: formatMoney(campaign.spent) })}</p>
                      <p>{t("topCampaigns.pending", { count: campaign.pending })}</p>
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

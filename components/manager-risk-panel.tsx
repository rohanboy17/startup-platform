"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveRefresh } from "@/lib/live-refresh";

type RiskPayload = {
  windowHours: number;
  suspiciousQueueCount: number;
  suspiciousUsers: Array<{
    id: string;
    name: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    suspiciousReason: string | null;
    flaggedAt: string | null;
  }>;
  ipHotspots: Array<{
    ipMasked: string;
    totalSubmissions: number;
    uniqueUsers: number;
    uniqueCampaigns: number;
  }>;
  highVelocity: Array<{
    id: string;
    name: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    isSuspicious: boolean;
    submissionsLastHour: number;
  }>;
  rejectionSpikes: Array<{
    id: string;
    title: string;
    category: string;
    decisions: number;
    rejected: number;
    rejectionRate: number;
    latestAt: string;
  }>;
  rejectionOutliers: Array<{
    id: string;
    name: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    isSuspicious: boolean;
    rejectionRate: number;
  }>;
  adminBacklog: {
    count: number;
    oldest: Array<{
      kind: "SUBMISSION" | "JOB_APPLICATION";
      id: string;
      createdAt: string;
      user: { id: string; name: string | null; level: string; isSuspicious: boolean };
      campaign: { id: string; title: string; category: string } | null;
      job: { id: string; title: string; jobCategory: string } | null;
    }>;
  };
  escalations: {
    count: number;
    latest: Array<{
      id: string;
      escalatedAt: string | null;
      reason: string | null;
      user: { id: string; name: string | null; level: string; isSuspicious: boolean };
      campaign: { id: string; title: string; category: string } | null;
    }>;
  };
};

type RiskResponse = RiskPayload & { error?: string };

function PanelCard({
  children,
  className = "",
}: {
  children: import("react").ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 backdrop-blur-md dark:shadow-black/20 ${className}`}>
      <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
    </Card>
  );
}

export default function ManagerRiskPanel() {
  const t = useTranslations("manager.riskPanel");
  const locale = useLocale();
  const [data, setData] = useState<RiskPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/risk?hours=24", { credentials: "include" });
    const raw = await res.text();
    let parsed: RiskResponse | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as RiskResponse) : null;
    } catch {
      setError(t("errors.unexpected"));
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || t("errors.failed"));
    } else {
      setError("");
      setData(parsed as RiskPayload);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 12000);

  const summary = useMemo(() => {
    if (!data) return null;
    return {
      flaggedUsers: data.suspiciousUsers.length,
      ipHotspots: data.ipHotspots.length,
      velocity: data.highVelocity.length,
      spikes: data.rejectionSpikes.length,
    };
  }, [data]);

  const slice = <T,>(items: T[]) => (limit === "ALL" ? items : items.slice(0, Number(limit)));

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data || !summary) return <p className="text-sm text-foreground/60">{t("empty")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <span>{t("controls.show")}</span>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value as "5" | "10" | "20" | "ALL")}
            className="rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="ALL">{t("controls.showAll")}</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.flaggedInReview")}</p>
          <p className="text-3xl font-semibold text-amber-700 dark:text-amber-200">{data.suspiciousQueueCount}</p>
        </PanelCard>
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.flaggedUsers")}</p>
          <p className="text-3xl font-semibold text-foreground">{summary.flaggedUsers}</p>
        </PanelCard>
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.ipHotspots", { hours: data.windowHours })}</p>
          <p className="text-3xl font-semibold text-foreground">{summary.ipHotspots}</p>
        </PanelCard>
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.highActivity")}</p>
          <p className="text-3xl font-semibold text-foreground">{summary.velocity}</p>
        </PanelCard>
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.rejectionSpikes")}</p>
          <p className="text-3xl font-semibold text-foreground">{summary.spikes}</p>
        </PanelCard>
        <PanelCard>
          <p className="text-sm text-foreground/60">{t("summary.waitingWithAdmin")}</p>
          <p className="text-3xl font-semibold text-foreground">{data.adminBacklog.count}</p>
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.flaggedUsers.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.flaggedUsers.subtitle")}</p>
          </div>
          {data.suspiciousUsers.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.flaggedUsers.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.suspiciousUsers).map((user) => (
                <div key={user.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">{user.name || t("sections.flaggedUsers.unnamed")}</p>
                      <p className="text-sm text-foreground/60">
                        {user.level} | {t("sections.flaggedUsers.approved", { count: user.totalApproved })} |{" "}
                        {t("sections.flaggedUsers.rejected", { count: user.totalRejected })}
                      </p>
                    </div>
                    {user.flaggedAt ? (
                      <p className="text-xs text-foreground/50">{new Date(user.flaggedAt).toLocaleString(locale)}</p>
                    ) : null}
                  </div>
                  {user.suspiciousReason ? (
                    <p className="mt-2 text-sm text-amber-700 break-words dark:text-amber-100/85">{user.suspiciousReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.ipHotspots.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.ipHotspots.subtitle")}</p>
          </div>
          {data.ipHotspots.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.ipHotspots.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.ipHotspots).map((spot) => (
                <div key={spot.ipMasked} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <p className="text-sm font-medium text-foreground">{spot.ipMasked}</p>
                  <p className="mt-1 text-sm text-foreground/60">
                    {t("sections.ipHotspots.submissions", { count: spot.totalSubmissions })} |{" "}
                    {t("sections.ipHotspots.users", { count: spot.uniqueUsers })} |{" "}
                    {t("sections.ipHotspots.campaigns", { count: spot.uniqueCampaigns })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.escalations.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.escalations.subtitle")}</p>
          </div>
          {data.escalations.latest.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.escalations.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.escalations.latest).map((row) => (
                <div key={row.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">{row.campaign?.title || t("sections.escalations.fallbackTitle")}</p>
                      <p className="text-sm text-foreground/60 break-words">
                        {(row.user.name || t("sections.escalations.unnamed"))} ({row.user.level})
                      </p>
                    </div>
                    {row.escalatedAt ? (
                      <p className="text-xs text-foreground/50">{new Date(row.escalatedAt).toLocaleString(locale)}</p>
                    ) : null}
                  </div>
                  {row.reason ? (
                    <p className="mt-2 text-sm text-amber-700 break-words dark:text-amber-100/85">{row.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.highVelocity.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.highVelocity.subtitle")}</p>
          </div>
          {data.highVelocity.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.highVelocity.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.highVelocity).map((user) => (
                <div key={user.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">{user.name || t("sections.highVelocity.unnamed")}</p>
                      <p className="text-sm text-foreground/60">
                        {user.level} | {t("sections.flaggedUsers.approved", { count: user.totalApproved })} |{" "}
                        {t("sections.flaggedUsers.rejected", { count: user.totalRejected })}
                      </p>
                    </div>
                    <span className="rounded-full border border-foreground/10 bg-background/60 px-2 py-0.5 text-xs text-foreground/80">
                      {t("sections.highVelocity.perHour", { count: user.submissionsLastHour })}
                    </span>
                  </div>
                  {user.isSuspicious ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-100/80">{t("sections.highVelocity.alreadyFlagged")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.rejectionOutliers.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.rejectionOutliers.subtitle")}</p>
          </div>
          {data.rejectionOutliers.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.rejectionOutliers.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.rejectionOutliers).map((user) => (
                <div key={user.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground break-words">{user.name || t("sections.rejectionOutliers.unnamed")}</p>
                    <span className="rounded-full border border-foreground/10 bg-background/60 px-2 py-0.5 text-xs text-foreground/70">
                      {Math.round(user.rejectionRate * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">
                    {user.level} | {t("sections.flaggedUsers.approved", { count: user.totalApproved })} |{" "}
                    {t("sections.flaggedUsers.rejected", { count: user.totalRejected })}
                  </p>
                  {user.isSuspicious ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-100/80">{t("sections.rejectionOutliers.alreadyFlagged")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.adminBacklog.title")}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("sections.adminBacklog.subtitle")}</p>
          </div>
          {data.adminBacklog.oldest.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("sections.adminBacklog.empty")}</p>
          ) : (
            <div className="space-y-3">
              {slice(data.adminBacklog.oldest).map((row) => (
                <div key={`${row.kind}:${row.id}`} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">
                        {row.campaign?.title || row.job?.title || t("sections.adminBacklog.fallbackTitle")}
                      </p>
                      <p className="text-sm text-foreground/60 break-words">
                        {(row.user.name || t("sections.adminBacklog.unnamed"))} ({row.user.level})
                      </p>
                      {row.job ? <p className="mt-1 text-xs text-foreground/50">{row.job.jobCategory}</p> : null}
                    </div>
                    <p className="text-xs text-foreground/50">{new Date(row.createdAt).toLocaleString(locale)}</p>
                  </div>
                  {row.user.isSuspicious ? (
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100/85">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p>{t("sections.adminBacklog.flaggedHint")}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t("sections.rejectionSpikes.title")}</p>
          <p className="mt-1 text-sm text-foreground/60">{t("sections.rejectionSpikes.subtitle", { hours: data.windowHours })}</p>
        </div>
        {data.rejectionSpikes.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("sections.rejectionSpikes.empty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {slice(data.rejectionSpikes).map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                <p className="font-medium text-foreground break-words">{campaign.title}</p>
                <p className="mt-1 text-sm text-foreground/60 break-words">{campaign.category}</p>
                <p className="mt-2 text-sm text-foreground/70">
                  {t("sections.rejectionSpikes.decisions", { count: campaign.decisions })} |{" "}
                  {t("sections.rejectionSpikes.rejected", { count: campaign.rejected })} |{" "}
                  {Math.round(campaign.rejectionRate * 100)}%
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  {t("sections.rejectionSpikes.latest", { date: new Date(campaign.latestAt).toLocaleString(locale) })}
                </p>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <Card className="rounded-2xl border-foreground/10 bg-background/50">
        <CardContent className="p-4 text-xs text-foreground/50 sm:p-6">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>{t("sections.footer")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

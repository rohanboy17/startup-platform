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
      id: string;
      createdAt: string;
      user: { id: string; name: string | null; level: string; isSuspicious: boolean };
      campaign: { id: string; title: string; category: string } | null;
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
    const flaggedUsers = data.suspiciousUsers.length;
    const ipHotspots = data.ipHotspots.length;
    const velocity = data.highVelocity.length;
    const spikes = data.rejectionSpikes.length;
    return { flaggedUsers, ipHotspots, velocity, spikes };
  }, [data]);

  if (loading) return <p className="text-sm text-white/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data || !summary) return <p className="text-sm text-white/60">{t("empty")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-white/60">
          <span>{t("controls.show")}</span>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value as "5" | "10" | "20" | "ALL")}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="ALL">{t("controls.showAll")}</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.flaggedInReview")}</p>
            <p className="text-3xl font-semibold text-amber-200">{data.suspiciousQueueCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.flaggedUsers")}</p>
            <p className="text-3xl font-semibold text-white">{summary.flaggedUsers}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.ipHotspots", { hours: data.windowHours })}</p>
            <p className="text-3xl font-semibold text-white">{summary.ipHotspots}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.highActivity")}</p>
            <p className="text-3xl font-semibold text-white">{summary.velocity}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.rejectionSpikes")}</p>
            <p className="text-3xl font-semibold text-white">{summary.spikes}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">{t("summary.waitingWithAdmin")}</p>
            <p className="text-3xl font-semibold text-white">{data.adminBacklog.count}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Flagged users</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.flaggedUsers.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.flaggedUsers.subtitle")}</p>
            </div>
            {data.suspiciousUsers.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.flaggedUsers.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.suspiciousUsers : data.suspiciousUsers.slice(0, Number(limit))).map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{user.name || t("sections.flaggedUsers.unnamed")}</p>
                        <p className="text-sm text-white/60">
                          {user.level} | {t("sections.flaggedUsers.approved", { count: user.totalApproved })} | {t("sections.flaggedUsers.rejected", { count: user.totalRejected })}
                        </p>
                      </div>
                      {user.flaggedAt ? (
                        <p className="text-xs text-white/50">{new Date(user.flaggedAt).toLocaleString(locale)}</p>
                      ) : null}
                    </div>
                    {user.suspiciousReason ? (
                      <p className="mt-2 text-sm text-amber-100/85 break-words">{user.suspiciousReason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.ipHotspots.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.ipHotspots.subtitle")}</p>
            </div>
            {data.ipHotspots.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.ipHotspots.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.ipHotspots : data.ipHotspots.slice(0, Number(limit))).map((spot) => (
                  <div key={spot.ipMasked} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">{spot.ipMasked}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {t("sections.ipHotspots.submissions", { count: spot.totalSubmissions })} | {t("sections.ipHotspots.users", { count: spot.uniqueUsers })} | {t("sections.ipHotspots.campaigns", { count: spot.uniqueCampaigns })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.escalations.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.escalations.subtitle")}</p>
            </div>
            {data.escalations.latest.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.escalations.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.escalations.latest : data.escalations.latest.slice(0, Number(limit))).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{row.campaign?.title || t("sections.escalations.fallbackTitle")}</p>
                        <p className="text-sm text-white/60 break-words">
                          {(row.user.name || t("sections.escalations.unnamed"))} ({row.user.level})
                        </p>
                      </div>
                      {row.escalatedAt ? (
                        <p className="text-xs text-white/50">{new Date(row.escalatedAt).toLocaleString(locale)}</p>
                      ) : null}
                    </div>
                    {row.reason ? (
                      <p className="mt-2 text-sm text-amber-100/85 break-words">{row.reason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.highVelocity.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.highVelocity.subtitle")}</p>
            </div>
            {data.highVelocity.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.highVelocity.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.highVelocity : data.highVelocity.slice(0, Number(limit))).map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{user.name || t("sections.highVelocity.unnamed")}</p>
                        <p className="text-sm text-white/60">
                          {user.level} | Approved {user.totalApproved} | Rejected {user.totalRejected}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80">
                        {t("sections.highVelocity.perHour", { count: user.submissionsLastHour })}
                      </span>
                    </div>
                    {user.isSuspicious ? (
                      <p className="mt-2 text-xs text-amber-100/80">{t("sections.highVelocity.alreadyFlagged")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.rejectionOutliers.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.rejectionOutliers.subtitle")}</p>
            </div>
            {data.rejectionOutliers.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.rejectionOutliers.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.rejectionOutliers : data.rejectionOutliers.slice(0, Number(limit))).map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white break-words">{user.name || t("sections.rejectionOutliers.unnamed")}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                        {Math.round(user.rejectionRate * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {user.level} | Approved {user.totalApproved} | Rejected {user.totalRejected}
                    </p>
                    {user.isSuspicious ? (
                      <p className="mt-2 text-xs text-amber-100/80">{t("sections.rejectionOutliers.alreadyFlagged")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.adminBacklog.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("sections.adminBacklog.subtitle")}</p>
            </div>
            {data.adminBacklog.oldest.length === 0 ? (
              <p className="text-sm text-white/60">{t("sections.adminBacklog.empty")}</p>
            ) : (
              <div className="space-y-3">
                {(limit === "ALL" ? data.adminBacklog.oldest : data.adminBacklog.oldest.slice(0, Number(limit))).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{row.campaign?.title || t("sections.adminBacklog.fallbackTitle")}</p>
                        <p className="text-sm text-white/60 break-words">
                          {(row.user.name || t("sections.adminBacklog.unnamed"))} ({row.user.level})
                        </p>
                      </div>
                      <p className="text-xs text-white/50">{new Date(row.createdAt).toLocaleString(locale)}</p>
                    </div>
                    {row.user.isSuspicious ? (
                      <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100/85">
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
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("sections.rejectionSpikes.title")}</p>
            <p className="mt-1 text-sm text-white/60">{t("sections.rejectionSpikes.subtitle", { hours: data.windowHours })}</p>
          </div>
          {data.rejectionSpikes.length === 0 ? (
            <p className="text-sm text-white/60">{t("sections.rejectionSpikes.empty")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(limit === "ALL" ? data.rejectionSpikes : data.rejectionSpikes.slice(0, Number(limit))).map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white break-words">{campaign.title}</p>
                  <p className="mt-1 text-sm text-white/60 break-words">{campaign.category}</p>
                  <p className="mt-2 text-sm text-white/70">
                    {t("sections.rejectionSpikes.decisions", { count: campaign.decisions })} | {t("sections.rejectionSpikes.rejected", { count: campaign.rejected })} |{" "}
                    {Math.round(campaign.rejectionRate * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-white/45">{t("sections.rejectionSpikes.latest", { date: new Date(campaign.latestAt).toLocaleString(locale) })}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-4 text-xs text-white/45 sm:p-6">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>{t("sections.footer")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

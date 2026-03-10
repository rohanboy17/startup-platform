"use client";

import { useCallback, useMemo, useState } from "react";
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
  const [data, setData] = useState<RiskPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/risk?hours=24", { credentials: "include" });
    const raw = await res.text();
    let parsed: RiskResponse | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as RiskResponse) : null;
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load risk signals");
    } else {
      setError("");
      setData(parsed as RiskPayload);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 12000);

  const summary = useMemo(() => {
    if (!data) return null;
    const flaggedUsers = data.suspiciousUsers.length;
    const ipHotspots = data.ipHotspots.length;
    const outliers = data.rejectionOutliers.length;
    const velocity = data.highVelocity.length;
    const spikes = data.rejectionSpikes.length;
    const escalations = data.escalations.count;
    return { flaggedUsers, ipHotspots, outliers, velocity, spikes, escalations };
  }, [data]);

  if (loading) return <p className="text-sm text-white/60">Loading risk signals...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data || !summary) return <p className="text-sm text-white/60">No risk data available.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Suspicious queue</p>
            <p className="text-3xl font-semibold text-amber-200">{data.suspiciousQueueCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Flagged users</p>
            <p className="text-3xl font-semibold text-white">{summary.flaggedUsers}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">IP hotspots ({data.windowHours}h)</p>
            <p className="text-3xl font-semibold text-white">{summary.ipHotspots}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">High velocity (1h)</p>
            <p className="text-3xl font-semibold text-white">{summary.velocity}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Rejection spikes</p>
            <p className="text-3xl font-semibold text-white">{summary.spikes}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Admin backlog</p>
            <p className="text-3xl font-semibold text-white">{data.adminBacklog.count}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Flagged users</p>
              <p className="mt-1 text-sm text-white/60">Account flags that likely require extra proof scrutiny.</p>
            </div>
            {data.suspiciousUsers.length === 0 ? (
              <p className="text-sm text-white/60">No flagged users at the moment.</p>
            ) : (
              <div className="space-y-3">
                {data.suspiciousUsers.slice(0, 12).map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{user.name || "Unnamed user"}</p>
                        <p className="text-sm text-white/60">
                          {user.level} | Approved {user.totalApproved} | Rejected {user.totalRejected}
                        </p>
                      </div>
                      {user.flaggedAt ? (
                        <p className="text-xs text-white/50">{new Date(user.flaggedAt).toLocaleString()}</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">IP hotspots</p>
              <p className="mt-1 text-sm text-white/60">High volume IPs (masked) across multiple accounts.</p>
            </div>
            {data.ipHotspots.length === 0 ? (
              <p className="text-sm text-white/60">No hotspots detected in the selected window.</p>
            ) : (
              <div className="space-y-3">
                {data.ipHotspots.map((spot) => (
                  <div key={spot.ipMasked} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">{spot.ipMasked}</p>
                    <p className="mt-1 text-sm text-white/60">
                      Submissions {spot.totalSubmissions} | Users {spot.uniqueUsers} | Campaigns {spot.uniqueCampaigns}
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Escalations</p>
              <p className="mt-1 text-sm text-white/60">Items escalated by managers to the Risk Center.</p>
            </div>
            {data.escalations.latest.length === 0 ? (
              <p className="text-sm text-white/60">No escalations recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.escalations.latest.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{row.campaign?.title || "Submission"}</p>
                        <p className="text-sm text-white/60 break-words">
                          {row.user.name || "Unnamed user"} ({row.user.level})
                        </p>
                      </div>
                      {row.escalatedAt ? (
                        <p className="text-xs text-white/50">{new Date(row.escalatedAt).toLocaleString()}</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">High submission velocity</p>
              <p className="mt-1 text-sm text-white/60">Users submitting unusually fast (last 1 hour).</p>
            </div>
            {data.highVelocity.length === 0 ? (
              <p className="text-sm text-white/60">No velocity alerts.</p>
            ) : (
              <div className="space-y-3">
                {data.highVelocity.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{user.name || "Unnamed user"}</p>
                        <p className="text-sm text-white/60">
                          {user.level} | Approved {user.totalApproved} | Rejected {user.totalRejected}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80">
                        {user.submissionsLastHour}/h
                      </span>
                    </div>
                    {user.isSuspicious ? (
                      <p className="mt-2 text-xs text-amber-100/80">Already flagged.</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">High rejection rate users</p>
              <p className="mt-1 text-sm text-white/60">Potential low-quality submitters. Use stricter checks.</p>
            </div>
            {data.rejectionOutliers.length === 0 ? (
              <p className="text-sm text-white/60">No outliers found right now.</p>
            ) : (
              <div className="space-y-3">
                {data.rejectionOutliers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white break-words">{user.name || "Unnamed user"}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                        {Math.round(user.rejectionRate * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {user.level} | Approved {user.totalApproved} | Rejected {user.totalRejected}
                    </p>
                    {user.isSuspicious ? (
                      <p className="mt-2 text-xs text-amber-100/80">Already flagged.</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Pending admin backlog</p>
              <p className="mt-1 text-sm text-white/60">Oldest items waiting for admin verification.</p>
            </div>
            {data.adminBacklog.oldest.length === 0 ? (
              <p className="text-sm text-white/60">No pending-admin items.</p>
            ) : (
              <div className="space-y-3">
                {data.adminBacklog.oldest.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white break-words">{row.campaign?.title || "Campaign"}</p>
                        <p className="text-sm text-white/60 break-words">
                          {row.user.name || "Unnamed user"} ({row.user.level})
                        </p>
                      </div>
                      <p className="text-xs text-white/50">{new Date(row.createdAt).toLocaleString()}</p>
                    </div>
                    {row.user.isSuspicious ? (
                      <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100/85">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          <p>This user is flagged. Consider escalating this item for extra review.</p>
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
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Unusual rejection spikes</p>
            <p className="mt-1 text-sm text-white/60">
              Campaigns with high manager rejection rate in the last {data.windowHours} hours.
            </p>
          </div>
          {data.rejectionSpikes.length === 0 ? (
            <p className="text-sm text-white/60">No rejection spikes detected.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.rejectionSpikes.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white break-words">{campaign.title}</p>
                  <p className="mt-1 text-sm text-white/60 break-words">{campaign.category}</p>
                  <p className="mt-2 text-sm text-white/70">
                    Decisions {campaign.decisions} | Rejected {campaign.rejected} |{" "}
                    {Math.round(campaign.rejectionRate * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-white/45">Latest: {new Date(campaign.latestAt).toLocaleString()}</p>
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
            <p>
              This view masks IPs and hides contact details by design. If you need stronger controls (device fingerprint,
              device fingerprinting, or IP blacklists), we can add them as admin-only tooling.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

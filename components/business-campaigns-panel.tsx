"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowRight, PauseCircle, PlayCircle, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type CampaignStatus = "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";

type Campaign = {
  id: string;
  title: string;
  description: string;
  category: string;
  taskLink: string | null;
  status: CampaignStatus;
  totalBudget: number;
  remainingBudget: number;
  rewardPerTask: number;
  createdAt: string;
  _count: { submissions: number };
  metrics: {
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    totalSlots: number;
    usedSlots: number;
    slotsLeft: number;
  };
};

const FILTERS: Array<{ value: "ALL" | CampaignStatus; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "LIVE", label: "Live" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

function statusTone(status: CampaignStatus) {
  if (status === "LIVE") return "bg-emerald-400/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/25";
  if (status === "PENDING") return "bg-amber-400/15 text-amber-900 dark:text-amber-100 border-amber-400/25";
  if (status === "APPROVED") return "bg-sky-400/15 text-sky-900 dark:text-sky-100 border-sky-400/25";
  if (status === "COMPLETED") return "bg-foreground/[0.04] text-foreground border-foreground/15";
  return "bg-rose-400/15 text-rose-900 dark:text-rose-100 border-rose-400/25";
}

function timeLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BusinessCampaignsPanel() {
  const [accessRole, setAccessRole] = useState<"OWNER" | "EDITOR" | "VIEWER">("OWNER");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CampaignStatus>("ALL");
  const [busyAction, setBusyAction] = useState<string>("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/campaigns", { credentials: "include" });
    const raw = await res.text();
    let data: {
      accessRole?: "OWNER" | "EDITOR" | "VIEWER";
      campaigns?: Campaign[];
      error?: string;
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as { campaigns?: Campaign[]; error?: string }) : {};
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(data.error || "Failed to load campaigns");
    } else {
      setError("");
      setAccessRole(data.accessRole || "OWNER");
      setCampaigns(data.campaigns || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === "ALL" ? true : campaign.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q
        ? true
        : [campaign.title, campaign.description, campaign.category].some((value) =>
            value.toLowerCase().includes(q)
          );
      return matchesStatus && matchesQuery;
    });
  }, [campaigns, query, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      live: campaigns.filter((item) => item.status === "LIVE").length,
      pending: campaigns.filter((item) => item.status === "PENDING").length,
      completed: campaigns.filter((item) => item.status === "COMPLETED").length,
    };
  }, [campaigns]);
  const canManageCampaigns = accessRole === "OWNER" || accessRole === "EDITOR";

  const runAction = useCallback(async (campaignId: string, action: "PAUSE" | "RESUME" | "CLOSE") => {
    setBusyAction(`${campaignId}:${action}`);
    setMessage("");

    const res = await fetch(`/api/v2/business/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setBusyAction("");

    if (!res.ok) {
      setMessage(data.error || "Action failed");
      return;
    }

    setMessage(data.message || "Campaign updated");
    emitDashboardLiveRefresh();
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-foreground/60">Loading campaigns...</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Campaigns" value={stats.total} />
        <KpiCard label="Live" value={stats.live} tone="success" />
        <KpiCard label="Pending Approval" value={stats.pending} tone="warning" />
        <KpiCard label="Completed" value={stats.completed} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-foreground/60">Campaign management</p>
              <h3 className="text-xl font-semibold text-foreground">Track status, budget, and moderation flow</h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canManageCampaigns ? (
                <Link
                  href="/dashboard/business/create"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-800 transition hover:bg-emerald-400/20 dark:text-emerald-100 sm:w-auto"
                >
                  Create campaign
                  <ArrowRight size={16} />
                </Link>
              ) : null}
              <Link
                href="/dashboard/business/analytics"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-background/60 px-4 py-2 text-sm text-foreground/80 transition hover:bg-background/80 sm:w-auto"
              >
                Open analytics
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, description, or category"
                className="border-foreground/20 bg-background/60 pl-10 text-foreground placeholder:text-foreground/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition sm:px-3 ${
                    statusFilter === filter.value
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                      : "border-foreground/10 bg-background/50 text-foreground/70 hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-2">
        {filteredCampaigns.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-10 text-center text-foreground/60 xl:col-span-2">
            No campaigns found for the selected filters.
          </div>
        ) : (
          filteredCampaigns.map((campaign) => {
            const spent = campaign.totalBudget - campaign.remainingBudget;
            const deployment =
              campaign.totalBudget > 0 ? Math.min(100, Math.round((spent / campaign.totalBudget) * 100)) : 0;
            const moderation =
              campaign._count.submissions > 0
                ? Math.round((campaign.metrics.approvedCount / campaign._count.submissions) * 100)
                : 0;

            return (
              <Card
                key={campaign.id}
                className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 transition hover:shadow-2xl hover:ring-1 hover:ring-foreground/15"
              >
                <CardContent className="space-y-5 p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-foreground">{campaign.title}</h3>
                        <StatusBadge
                          label={campaign.status}
                          tone={campaign.status === "LIVE" ? "success" : campaign.status === "PENDING" ? "warning" : campaign.status === "REJECTED" ? "danger" : "info"}
                          className={statusTone(campaign.status)}
                        />
                      </div>
                      <p className="break-words text-sm text-foreground/60">{campaign.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
                        <span>{getCampaignCategoryLabel(campaign.category)}</span>
                        <span>Created {timeLabel(campaign.createdAt)}</span>
                        {campaign.taskLink ? <span>Task link attached</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {canManageCampaigns && campaign.status === "LIVE" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={busyAction === `${campaign.id}:PAUSE`}
                          onClick={() => void runAction(campaign.id, "PAUSE")}
                        >
                          <PauseCircle size={16} />
                          {busyAction === `${campaign.id}:PAUSE` ? "Pausing..." : "Pause"}
                        </Button>
                      ) : null}
                      {canManageCampaigns && campaign.status === "APPROVED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={busyAction === `${campaign.id}:RESUME`}
                          onClick={() => void runAction(campaign.id, "RESUME")}
                        >
                          <PlayCircle size={16} />
                          {busyAction === `${campaign.id}:RESUME` ? "Resuming..." : "Resume"}
                        </Button>
                      ) : null}
                      {canManageCampaigns && !["COMPLETED", "REJECTED"].includes(campaign.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={busyAction === `${campaign.id}:CLOSE`}
                          onClick={() => void runAction(campaign.id, "CLOSE")}
                        >
                          <XCircle size={16} />
                          {busyAction === `${campaign.id}:CLOSE` ? "Closing..." : "Close"}
                        </Button>
                      ) : null}
                      <Link href={`/dashboard/business/campaigns/${campaign.id}`} className="w-full sm:w-auto">
                        <Button type="button" variant="outline" className="w-full sm:w-auto">
                          {canManageCampaigns ? "View / Edit" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Budget left</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-700 dark:text-emerald-200">
                        INR {formatMoney(campaign.remainingBudget)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Reward / slot</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        INR {formatMoney(campaign.rewardPerTask)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Slots left</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{campaign.metrics.slotsLeft}</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Pending review</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{campaign.metrics.pendingCount}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                        <span>Budget deployment</span>
                        <span>{deployment}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-foreground/10">
                        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${deployment}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-foreground/60">
                        Spent INR {formatMoney(spent)} of INR {formatMoney(campaign.totalBudget)}
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                        <span>Approval quality</span>
                        <span>{moderation}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-foreground/10">
                        <div className="h-2 rounded-full bg-sky-400" style={{ width: `${moderation}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-foreground/60">
                        Approved {campaign.metrics.approvedCount} | Rejected {campaign.metrics.rejectedCount} |
                        Total submissions {campaign._count.submissions}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

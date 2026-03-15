"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { normalizeExternalUrl } from "@/lib/external-url";
import { useLiveRefresh } from "@/lib/live-refresh";
import ManagerSubmissionActions from "@/components/manager-submission-actions";
import ProofImageDialog from "@/components/proof-image-dialog";

type QueueItem = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  proofImage: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    level: string;
    totalApproved: number;
    totalRejected: number;
    isSuspicious: boolean;
    suspiciousReason: string | null;
  };
  campaign: {
    id: string;
    title: string;
    category: string;
    rewardPerTask: number;
    description: string;
    taskLink: string | null;
    instructions: Array<{ sequence: number; instructionText: string }>;
  } | null;
};

type QueueResponse = {
  submissions?: QueueItem[];
  error?: string;
};

type QueueFilter = "ALL" | "SUSPICIOUS" | "HIGH_LEVEL";

const FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "SUSPICIOUS", label: "Suspicious" },
  { value: "HIGH_LEVEL", label: "High level" },
];

function waitLabel(value: string) {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m waiting`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h waiting`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d waiting`;
}

function proofPreview(item: QueueItem) {
  return item.proofText || item.proofLink || item.proofImage || item.proof || "No proof content";
}

export default function ManagerSubmissionQueuePanel() {
  const [data, setData] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/submissions", { credentials: "include" });
    const raw = await res.text();
    let parsed: QueueResponse = {};

    try {
      parsed = raw ? (JSON.parse(raw) as QueueResponse) : {};
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed.error || "Failed to load manager queue");
    } else {
      setError("");
      setData(parsed.submissions || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  const stats = useMemo(() => {
    const suspicious = data.filter((item) => item.user.isSuspicious).length;
    const highLevel = data.filter((item) => ["L4", "L5"].includes(item.user.level)).length;
    return {
      total: data.length,
      suspicious,
      highLevel,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "SUSPICIOUS"
            ? item.user.isSuspicious
            : ["L4", "L5"].includes(item.user.level);

      const matchesSearch = query
        ? [
            item.campaign?.title,
            item.campaign?.category,
            item.campaign?.description,
            item.campaign?.instructions?.map((row) => row.instructionText).join(" "),
            item.user.name,
            proofPreview(item),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;

      return matchesFilter && matchesSearch;
    });
  }, [data, filter, search]);

  if (loading) return <p className="text-sm text-white/60">Loading manager queue...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Queue Size" value={stats.total} />
        <KpiCard label="Suspicious In Queue" value={stats.suspicious} tone="warning" />
        <KpiCard label="High-Level Users" value={stats.highLevel} tone="info" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/60">Queue filters</p>
              <h3 className="text-xl font-semibold text-white">Sort by risk or search quickly</h3>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaign, user, or proof"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35 lg:max-w-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {FILTERS.map((item) => {
                const active = filter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm transition ${
                      active
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-black/20 text-white/65 hover:bg-black/30 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">
            No queue items match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((submission) => (
            <Card key={submission.id} className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white break-words">
                      {submission.campaign?.title || "Campaign submission"}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {submission.campaign?.category || "Uncategorized"} | Reward INR {formatMoney(submission.campaign?.rewardPerTask)}
                    </p>
                  </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <span>{waitLabel(submission.createdAt)}</span>
                    <StatusBadge label={submission.user.level} tone="neutral" />
                    {submission.user.isSuspicious ? (
                      <StatusBadge label="Suspicious" tone="warning" />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 min-[1450px]:grid-cols-[0.72fr_1.28fr]">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/35">User context</p>
                    <p className="text-sm text-white/80 break-words">
                      {submission.user.name || "Unnamed user"}
                    </p>
                    <p className="text-sm text-white/60">
                      Approved: {submission.user.totalApproved} | Rejected: {submission.user.totalRejected}
                    </p>
                    {submission.user.isSuspicious ? (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100/85">
                        <div className="flex items-start gap-2">
                          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                          <p className="break-words">
                            {submission.user.suspiciousReason || "This account is currently flagged for review."}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    {submission.campaign ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/35">Task details</p>
                          {submission.campaign.taskLink ? (
                            <a
                              href={normalizeExternalUrl(submission.campaign.taskLink) ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-emerald-200 underline underline-offset-4"
                            >
                              <ExternalLink size={14} />
                              Open task link
                            </a>
                          ) : null}
                        </div>

                        <p className="text-sm text-white/80 break-words">{submission.campaign.description}</p>

                        {submission.campaign.instructions?.length ? (
                          <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <summary className="cursor-pointer text-sm text-white/70">
                              View instructions ({submission.campaign.instructions.length})
                            </summary>
                            <div className="mt-3 space-y-2 text-sm text-white/75">
                              {submission.campaign.instructions.map((row) => (
                                <div key={row.sequence} className="flex gap-3">
                                  <span className="mt-0.5 shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/60">
                                    {row.sequence}
                                  </span>
                                  <span className="break-words">{row.instructionText}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <p className="text-sm text-white/55">No instructions have been configured for this campaign.</p>
                        )}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Proof preview</p>
                      <div className="flex flex-wrap gap-3">
                        {submission.proofLink ? (
                          <a
                            href={normalizeExternalUrl(submission.proofLink) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-emerald-200 underline underline-offset-4"
                          >
                            <ExternalLink size={14} />
                            Open proof link
                          </a>
                        ) : null}
                        {submission.proofImage ? (
                          <ProofImageDialog url={submission.proofImage} label="Preview screenshot" />
                        ) : null}
                      </div>
                    </div>
                    <div className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80 break-words">
                        {proofPreview(submission)}
                      </p>
                    </div>
                    {!submission.proofLink && !submission.proofText && !submission.proofImage ? (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100/85">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          <p>Only raw proof text is stored for this item. Review carefully before approving.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <ManagerSubmissionActions submissionId={submission.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

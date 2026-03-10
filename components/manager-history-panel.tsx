"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveRefresh } from "@/lib/live-refresh";
import { normalizeExternalUrl } from "@/lib/external-url";

type HistoryRow = {
  id: string;
  action:
    | "MANAGER_APPROVED_SUBMISSION"
    | "MANAGER_REJECTED_SUBMISSION"
    | "MANAGER_ESCALATED_SUBMISSION"
    | string;
  createdAt: string;
  submissionId: string | null;
  reason: string | null;
  submission: {
    id: string;
    createdAt: string;
    proofLink: string | null;
    proofText: string | null;
    proof: string;
    user: { id: string; name: string | null; level: string; isSuspicious: boolean };
    campaign: { id: string; title: string; category: string; rewardPerTask: number } | null;
    managerEscalatedAt?: string | null;
    managerEscalationReason?: string | null;
  } | null;
};

type HistoryResponse = { rows?: HistoryRow[]; error?: string };
type Filter = "ALL" | "APPROVED" | "REJECTED" | "ESCALATED";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ESCALATED", label: "Escalated" },
];

function statusLabel(action: string) {
  return action === "MANAGER_APPROVED_SUBMISSION"
    ? "Approved"
    : action === "MANAGER_REJECTED_SUBMISSION"
      ? "Rejected"
      : action === "MANAGER_ESCALATED_SUBMISSION"
        ? "Escalated"
        : "Updated";
}

export default function ManagerHistoryPanel() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/history?limit=120", { credentials: "include" });
    const raw = await res.text();
    let parsed: HistoryResponse = {};
    try {
      parsed = raw ? (JSON.parse(raw) as HistoryResponse) : {};
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load manager history");
    } else {
      setError("");
      setRows(parsed.rows || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 12000);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "APPROVED"
            ? row.action === "MANAGER_APPROVED_SUBMISSION"
            : filter === "REJECTED"
              ? row.action === "MANAGER_REJECTED_SUBMISSION"
              : row.action === "MANAGER_ESCALATED_SUBMISSION";

      const haystack = [
        row.submission?.campaign?.title,
        row.submission?.campaign?.category,
        row.submission?.user?.name,
        row.reason,
        row.submissionId,
        row.submission?.managerEscalationReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = query ? haystack.includes(query) : true;
      return matchesFilter && matchesSearch;
    });
  }, [filter, rows, search]);

  if (loading) return <p className="text-sm text-white/60">Loading history...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    filter === item.value
                      ? "bg-white text-black"
                      : "border border-white/10 bg-black/20 text-white/70 hover:bg-black/30"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaign, user, reason..."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-emerald-300/60 md:w-80"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">No history items match the current filters.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => {
            const status = statusLabel(row.action);
            const statusTone =
              status === "Approved"
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                : status === "Rejected"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                  : status === "Escalated"
                    ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/75";

            return (
              <Card key={row.id} className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white break-words">
                        {row.submission?.campaign?.title || "Submission review"}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {row.submission?.campaign?.category || "Uncategorized"} |{" "}
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusTone}`}>{status}</span>
                      {row.submission?.user?.isSuspicious ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                          Flagged
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">User</p>
                      <p className="text-sm text-white/80 break-words">
                        {row.submission?.user?.name || "Unnamed user"}{" "}
                        <span className="text-white/50">({row.submission?.user?.level || "L1"})</span>
                      </p>
                      <p className="text-xs text-white/50 break-all">Submission ID: {row.submissionId || "unknown"}</p>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Reason / Proof</p>
                        {row.submission?.proofLink ? (
                          <a
                            href={normalizeExternalUrl(row.submission.proofLink) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-emerald-200 underline underline-offset-4"
                          >
                            <ExternalLink size={14} />
                            Open proof
                          </a>
                        ) : null}
                      </div>
                      {row.reason || row.submission?.managerEscalationReason ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                          <div className="flex items-start gap-2">
                            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-200" />
                            <p className="break-words">{row.reason || row.submission?.managerEscalationReason}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/70 break-words">
                          {row.submission?.proofText || row.submission?.proofLink || row.submission?.proof || "No proof stored"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

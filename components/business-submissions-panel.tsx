"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCampaignCategoryLabel } from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type SubmissionStage =
  | "PENDING_MANAGER"
  | "PENDING_ADMIN"
  | "APPROVED"
  | "MANAGER_REJECTED"
  | "ADMIN_REJECTED";

type SubmissionRow = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  managerStatus: string;
  adminStatus: string;
  rewardAmount: number;
  createdAt: string;
  stage: SubmissionStage;
  reason: string | null;
  campaign: {
    id: string;
    title: string;
    category: string;
    rewardPerTask: number;
  } | null;
  user: {
    name: string | null;
  };
};

type BusinessSubmissionsResponse = {
  counts: {
    total: number;
    pendingManager: number;
    pendingAdmin: number;
    approved: number;
    rejected: number;
  };
  submissions: SubmissionRow[];
  error?: string;
};

const FILTERS: Array<{ value: "ALL" | SubmissionStage; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING_MANAGER", label: "Pending Manager" },
  { value: "PENDING_ADMIN", label: "Pending Admin" },
  { value: "APPROVED", label: "Approved" },
  { value: "MANAGER_REJECTED", label: "Manager Rejected" },
  { value: "ADMIN_REJECTED", label: "Admin Rejected" },
];

function stageTone(stage: SubmissionStage) {
  if (stage === "APPROVED") return "bg-emerald-400/15 text-emerald-200 border-emerald-400/20";
  if (stage === "PENDING_MANAGER" || stage === "PENDING_ADMIN") {
    return "bg-amber-400/15 text-amber-100 border-amber-400/20";
  }
  return "bg-rose-400/15 text-rose-100 border-rose-400/20";
}

function stageLabel(stage: SubmissionStage) {
  switch (stage) {
    case "PENDING_MANAGER":
      return "Pending Manager";
    case "PENDING_ADMIN":
      return "Pending Admin";
    case "APPROVED":
      return "Approved";
    case "MANAGER_REJECTED":
      return "Manager Rejected";
    default:
      return "Admin Rejected";
  }
}

export default function BusinessSubmissionsPanel() {
  const [data, setData] = useState<BusinessSubmissionsResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | SubmissionStage>("ALL");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/submissions", { credentials: "include" });
    const raw = await res.text();
    let parsed: BusinessSubmissionsResponse = {
      counts: { total: 0, pendingManager: 0, pendingAdmin: 0, approved: 0, rejected: 0 },
      submissions: [],
    };
    try {
      parsed = raw ? (JSON.parse(raw) as BusinessSubmissionsResponse) : parsed;
    } catch {
      setError("Unexpected server response");
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load submission pipeline");
      return;
    }
    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  const filtered = useMemo(() => {
    const rows = data?.submissions || [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === "ALL" ? true : row.stage === filter;
      const matchesQuery = !q
        ? true
        : [
            row.campaign?.title || "",
            row.user.name || "",
            row.proofText || "",
            row.proofLink || "",
            row.reason || "",
          ].some((value) => value.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [data, filter, query]);

  function exportCsv() {
    const header = [
      "Campaign",
      "Category",
      "User",
      "Stage",
      "Reward",
      "Submitted At",
      "Reason",
      "Proof",
    ];

    const rows = filtered.map((item) => [
      item.campaign?.title || "",
      item.campaign?.category || "",
      item.user.name || "",
      stageLabel(item.stage),
      String(item.rewardAmount || item.campaign?.rewardPerTask || 0),
      item.createdAt,
      item.reason || "",
      item.proofText || item.proofLink || item.proof || "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "business-submissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading submission pipeline...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">Total</p><p className="mt-2 text-3xl font-semibold text-white">{data.counts.total}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">Pending Manager</p><p className="mt-2 text-3xl font-semibold text-amber-100">{data.counts.pendingManager}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">Pending Admin</p><p className="mt-2 text-3xl font-semibold text-amber-100">{data.counts.pendingAdmin}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">Approved</p><p className="mt-2 text-3xl font-semibold text-emerald-200">{data.counts.approved}</p></CardContent></Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md"><CardContent className="p-4 sm:p-5"><p className="text-sm text-white/60">Rejected</p><p className="mt-2 text-3xl font-semibold text-rose-200">{data.counts.rejected}</p></CardContent></Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/60">Submission review</p>
              <h3 className="text-xl font-semibold text-white">Read-only moderation pipeline</h3>
            </div>
            <Button type="button" variant="outline" onClick={exportCsv} className="w-full sm:w-auto">
              <Download size={16} />
              Export CSV
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaign, user, proof, or reason"
                className="border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    filter === item.value
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-black/20 text-white/70 hover:bg-black/30 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 text-sm text-white/55">No submissions found for the current filter.</CardContent>
          </Card>
        ) : (
          filtered.map((submission) => (
            <Card key={submission.id} className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-white">{submission.campaign?.title || "Campaign"}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${stageTone(submission.stage)}`}>
                        {stageLabel(submission.stage)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {getCampaignCategoryLabel(submission.campaign?.category || "")} | Reward INR{" "}
                      {formatMoney(submission.rewardAmount || submission.campaign?.rewardPerTask || 0)}
                    </p>
                  </div>
                  <p className="text-xs text-white/45">
                    {new Date(submission.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Participant</p>
                    <p className="mt-2 text-sm text-white">{submission.user.name || "Unnamed User"}</p>
                    <p className="text-xs text-white/45">Participant identity is hidden for privacy.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Proof</p>
                    <p className="mt-2 break-words text-sm text-white/75">
                      {submission.proofText || submission.proofLink || submission.proof}
                    </p>
                  </div>
                </div>

                {submission.reason ? (
                  <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-100/70">Review reason</p>
                    <p className="mt-2 text-sm text-rose-50">{submission.reason}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type SubmissionStage =
  | "PENDING_MANAGER"
  | "PENDING_ADMIN"
  | "APPROVED"
  | "MANAGER_REJECTED"
  | "ADMIN_REJECTED";

type Submission = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  managerStatus: string;
  adminStatus: string;
  rewardAmount: number;
  createdAt: string;
  stage: SubmissionStage;
  campaign: {
    title: string;
    category: string;
    rewardPerTask: number;
  } | null;
};

const FILTERS: Array<{ value: "ALL" | SubmissionStage; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING_MANAGER", label: "Pending manager" },
  { value: "PENDING_ADMIN", label: "Pending admin" },
  { value: "APPROVED", label: "Approved" },
  { value: "MANAGER_REJECTED", label: "Manager rejected" },
  { value: "ADMIN_REJECTED", label: "Admin rejected" },
];

function stageLabel(stage: SubmissionStage) {
  switch (stage) {
    case "PENDING_MANAGER":
      return "Pending manager review";
    case "PENDING_ADMIN":
      return "Pending admin review";
    case "APPROVED":
      return "Approved";
    case "MANAGER_REJECTED":
      return "Rejected by manager";
    case "ADMIN_REJECTED":
      return "Rejected by admin";
    default:
      return stage;
  }
}

function stageTone(stage: SubmissionStage) {
  switch (stage) {
    case "APPROVED":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "MANAGER_REJECTED":
    case "ADMIN_REJECTED":
      return "border-rose-400/20 bg-rose-500/10 text-rose-100";
    case "PENDING_ADMIN":
      return "border-sky-400/20 bg-sky-500/10 text-sky-100";
    default:
      return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
}

function proofPreview(submission: Submission) {
  return submission.proofText || submission.proofLink || submission.proof || "No proof text stored";
}

export default function UserV2SubmissionsPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | SubmissionStage>("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/submissions", { credentials: "include" });
    const raw = await res.text();
    let data: { submissions?: Submission[]; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { submissions?: Submission[]; error?: string }) : {};
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(data.error || "Failed to load submissions");
    } else {
      setError("");
      setSubmissions(data.submissions || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  const stats = useMemo(() => {
    const approved = submissions.filter((item) => item.stage === "APPROVED").length;
    const rejected = submissions.filter(
      (item) => item.stage === "MANAGER_REJECTED" || item.stage === "ADMIN_REJECTED"
    ).length;
    const pending = submissions.length - approved - rejected;
    return { total: submissions.length, approved, rejected, pending };
  }, [submissions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesFilter = filter === "ALL" ? true : submission.stage === filter;
      const matchesSearch = query
        ? [submission.campaign?.title, submission.campaign?.category, proofPreview(submission)]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, submissions]);

  if (loading) return <p className="text-sm text-white/60">Loading submissions...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Total submissions</p>
            <p className="text-3xl font-semibold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Pending review</p>
            <p className="text-3xl font-semibold text-amber-200">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Approved</p>
            <p className="text-3xl font-semibold text-emerald-300">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-4 sm:p-6">
            <p className="text-sm text-white/60">Rejected</p>
            <p className="text-3xl font-semibold text-rose-300">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/60">Submission pipeline</p>
              <h3 className="text-xl font-semibold text-white">Track each review stage clearly</h3>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaign or proof"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35 lg:max-w-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
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
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">
            No submissions match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((submission) => {
            const reward = submission.rewardAmount || submission.campaign?.rewardPerTask || 0;
            const isRejected =
              submission.stage === "MANAGER_REJECTED" || submission.stage === "ADMIN_REJECTED";
            return (
              <Card key={submission.id} className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {submission.campaign?.title || "Campaign submission"}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {submission.campaign?.category || "Uncategorized"} | Reward INR {formatMoney(reward)}
                      </p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${stageTone(submission.stage)}`}>
                      {stageLabel(submission.stage)}
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Review status</p>
                      <p className="text-sm text-white/75">Manager: {submission.managerStatus.replaceAll("_", " ")}</p>
                      <p className="text-sm text-white/75">Admin: {submission.adminStatus.replaceAll("_", " ")}</p>
                      <p className="text-sm text-white/50">Submitted {new Date(submission.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Proof preview</p>
                      <p className="text-sm text-white/80 break-words">{proofPreview(submission)}</p>
                      {submission.proofLink ? (
                        <a
                          href={submission.proofLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-sm text-emerald-200 underline underline-offset-4"
                        >
                          Open proof link
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {isRejected ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100/85">
                      No structured rejection reason is stored yet for this submission. Only rejection status is available.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

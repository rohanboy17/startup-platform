"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type Submission = {
  id: string;
  proof: string;
  proofLink: string | null;
  proofText: string | null;
  managerStatus: string;
  adminStatus: string;
  rewardAmount: number;
  createdAt: string;
  campaign: {
    title: string;
    category: string;
    rewardPerTask: number;
  } | null;
};

export default function UserV2SubmissionsPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

    if (!res.ok) setError(data.error || "Failed to load submissions");
    else {
      setError("");
      setSubmissions(data.submissions || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  if (loading) return <p className="text-sm text-white/60">Loading submissions...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      {submissions.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">
            No submissions yet. Complete a campaign task to get started.
          </CardContent>
        </Card>
      ) : (
        submissions.map((submission) => (
          <Card key={submission.id} className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="space-y-2 p-6">
              <p className="font-semibold">{submission.campaign?.title || "Campaign Submission"}</p>
              <p className="text-sm text-white/70">
                Category: {submission.campaign?.category || "-"} | Reward: INR{" "}
                {formatMoney(submission.rewardAmount || submission.campaign?.rewardPerTask || 0)}
              </p>
              <p className="text-sm text-white/70">
                Manager: {submission.managerStatus} | Admin: {submission.adminStatus}
              </p>
              <p className="text-sm text-white/70">
                Proof: {submission.proofText || submission.proofLink || submission.proof}
              </p>
              <p className="text-xs text-white/50">{new Date(submission.createdAt).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

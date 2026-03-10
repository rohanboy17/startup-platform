"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeExternalUrl } from "@/lib/external-url";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";
import { formatMoney } from "@/lib/format-money";

type CampaignResponse = {
  campaign?: {
    id: string;
    title: string;
    description: string;
    category: string;
    taskLink: string | null;
    rewardPerTask: number;
    totalBudget: number;
    remainingBudget: number;
    status: string;
    allowedSubmissions: number;
    usedSubmissions: number;
    leftSubmissions: number;
    userSubmissionCount: number;
    isAvailable: boolean;
    instructions: Array<{
      id: string;
      instructionText: string;
      sequence: number;
    }>;
    currentInstruction: {
      id: string;
      instructionText: string;
      sequence: number;
    } | null;
  };
  error?: string;
};

function relativeStatusText(isAvailable: boolean, leftSubmissions: number) {
  if (!isAvailable && leftSubmissions <= 0) return "All campaign slots are currently occupied.";
  if (!isAvailable) return "This campaign is not accepting submissions right now.";
  return `${leftSubmissions} slot${leftSubmissions === 1 ? "" : "s"} left right now.`;
}

export default function UserCampaignDetailPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [error, setError] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [proofText, setProofText] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/v2/campaigns/${campaignId}/submissions`, { credentials: "include" });
    const raw = await res.text();
    let parsed: CampaignResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as CampaignResponse) : null;
    } catch {
      setError("Unexpected server response");
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load campaign");
      setData(null);
      return;
    }

    setError("");
    setData(parsed);
  }, [campaignId]);

  useLiveRefresh(load, 10000);

  const submit = async () => {
    if (!proofLink.trim() && !proofText.trim()) {
      setSubmitMessage("Add a proof link or proof text before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    const res = await fetch(`/api/v2/campaigns/${campaignId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        proofLink: proofLink.trim() || undefined,
        proofText: proofText.trim() || undefined,
      }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }

    setSubmitting(false);

    if (!res.ok) {
      setSubmitMessage(parsed.error || "Submission failed");
      return;
    }

    setProofLink("");
    setProofText("");
    setSubmitMessage(parsed.message || "Submission sent for review.");
    emitDashboardLiveRefresh();
    await load();
  };

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!data?.campaign) {
    return <p className="text-sm text-white/60">Loading campaign details...</p>;
  }

  const { campaign } = data;
  const fillRate = campaign.allowedSubmissions > 0
    ? Math.max(0, Math.min(100, Math.round((campaign.usedSubmissions / campaign.allowedSubmissions) * 100)))
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/user/tasks" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
            <ArrowLeft size={16} />
            Back to tasks
          </Link>
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-emerald-300/70">Task detail</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{campaign.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">{campaign.description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            {campaign.category}
          </div>
          {campaign.taskLink ? (
            <a
              href={normalizeExternalUrl(campaign.taskLink) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <ExternalLink size={16} />
              Open task link
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Per task reward</p>
            <p className="text-3xl font-semibold text-emerald-300">INR {formatMoney(campaign.rewardPerTask)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Slots left</p>
            <p className="text-3xl font-semibold text-white">{campaign.leftSubmissions}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Used / allowed</p>
            <p className="text-3xl font-semibold text-white">{campaign.usedSubmissions} / {campaign.allowedSubmissions}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Your submissions here</p>
            <p className="text-3xl font-semibold text-violet-200">{campaign.userSubmissionCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Task details</p>
              <h3 className="text-xl font-semibold text-white">Current slot instruction</h3>
            </div>

            {campaign.currentInstruction ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/70">
                  Current detail #{campaign.currentInstruction.sequence}
                </p>
                <p className="mt-3 text-sm text-white/90 break-words">
                  {campaign.currentInstruction.instructionText}
                </p>
              </div>
            ) : null}

            {campaign.instructions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                No task detail variants were added for this campaign. Use the task description and link carefully.
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">Live task detail assignment</p>
                <p className="mt-1 text-sm text-white/55">
                  This detail refreshes automatically as slots are taken and released. If unique task details
                  run out before campaign slots are full, the system reuses available details from the same pool.
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <span>Campaign fill rate</span>
                <span>{fillRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-sky-400" style={{ width: `${fillRate}%` }} />
              </div>
              <p className="mt-2 text-xs text-white/50">{relativeStatusText(campaign.isAvailable, campaign.leftSubmissions)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Submit proof</p>
              <h3 className="text-xl font-semibold text-white">Send this task for review</h3>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/85">
              <div className="flex items-start gap-3">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <p>
                  Submit genuine proof only. Invalid or copied proof can be rejected and may trigger fraud review.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Proof link</label>
                <Input
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="Paste the proof URL if this task needs a link"
                  className="min-h-11 border-white/15 bg-black/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Proof details</label>
                <textarea
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Add submission details, notes, or text proof"
                  className="min-h-[140px] w-full rounded-md border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-white/30"
                />
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || !campaign.isAvailable}
              className="w-full bg-white text-black hover:bg-white"
            >
              {submitting ? "Submitting..." : campaign.isAvailable ? "Submit for review" : "Submission unavailable"}
            </Button>

            {submitMessage ? <p className="text-sm text-white/65">{submitMessage}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

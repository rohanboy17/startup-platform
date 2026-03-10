"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  getCampaignCategoryLabel,
} from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type Instruction = {
  id: string;
  instructionText: string;
  sequence: number;
};

type BusinessCampaignEditorProps = {
  campaign: {
    id: string;
    title: string;
    description: string;
    category: string;
    taskLink: string | null;
    rewardPerTask: number;
    totalBudget: number;
    remainingBudget: number;
    instructions: Instruction[];
    submissionCount: number;
  };
  walletBalance: number;
};

export default function BusinessCampaignEditor({
  campaign,
  walletBalance,
}: BusinessCampaignEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [category, setCategory] = useState(campaign.category);
  const [taskLink, setTaskLink] = useState(campaign.taskLink || "");
  const [instructionsText, setInstructionsText] = useState(
    campaign.instructions.map((item) => item.instructionText).join("\n")
  );
  const [rewardPerTask, setRewardPerTask] = useState(String(campaign.rewardPerTask));
  const [totalBudget, setTotalBudget] = useState(String(campaign.totalBudget));
  const [loading, setLoading] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reward = Number(rewardPerTask) || 0;
  const budget = Number(totalBudget) || 0;
  const spentBudget = campaign.totalBudget - campaign.remainingBudget;
  const budgetDelta = budget - campaign.totalBudget;

  const stats = useMemo(() => {
    const projectedSlots = reward > 0 ? Math.floor(budget / reward) : 0;
    const projectedRemaining = Math.max(0, budget - spentBudget);
    const releaseAmount = budgetDelta < 0 ? Math.abs(budgetDelta) : 0;
    const topUpAmount = budgetDelta > 0 ? budgetDelta : 0;
    const projectedWallet = walletBalance - topUpAmount + releaseAmount;
    const insufficient = topUpAmount > 0 && walletBalance < topUpAmount;
    const invalidUsedSlots = projectedSlots < campaign.submissionCount;

    return {
      projectedSlots,
      projectedRemaining,
      releaseAmount,
      topUpAmount,
      projectedWallet,
      insufficient,
      invalidUsedSlots,
    };
  }, [budget, budgetDelta, campaign.submissionCount, reward, spentBudget, walletBalance]);

  async function saveChanges() {
    setLoading(true);
    setError("");
    setMessage("");

    const instructions = instructionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const res = await fetch(`/api/v2/business/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        category,
        taskLink: taskLink || null,
        rewardPerTask: reward,
        totalBudget: budget,
        instructions,
      }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update campaign");
      return;
    }

    setMessage(data.message || "Campaign updated");
    emitDashboardLiveRefresh();
    router.refresh();
  }

  async function duplicateCampaign() {
    setDupLoading(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/v2/business/campaigns/${campaign.id}`, {
      method: "POST",
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setDupLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to duplicate campaign");
      return;
    }

    setMessage(data.message || "Campaign duplicated");
    emitDashboardLiveRefresh();
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-white/60">Campaign management</p>
          <h3 className="text-2xl font-semibold text-white">Edit campaign, budget, and instructions</h3>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            Changes are validated against current spend and used slots before they are applied.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => void duplicateCampaign()} disabled={dupLoading}>
          <Copy size={16} />
          {dupLoading ? "Duplicating..." : "Duplicate campaign"}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Task Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Describe the campaign"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {CAMPAIGN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Task Link</label>
              <Input
                value={taskLink}
                onChange={(e) => setTaskLink(e.target.value)}
                placeholder="Optional destination link"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Task Details</label>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              className="min-h-36 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              placeholder={"Add one instruction per line\nExample:\nOpen the page\nComplete the required action\nSubmit proof"}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Per Task Reward</label>
              <Input
                type="number"
                min="1"
                value={rewardPerTask}
                onChange={(e) => setRewardPerTask(e.target.value)}
                placeholder="Reward per approved slot"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Total Budget</label>
              <Input
                type="number"
                min={spentBudget > 0 ? spentBudget.toFixed(2) : "1"}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Campaign budget"
              />
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void saveChanges()}
            disabled={loading || stats.insufficient || stats.invalidUsedSlots}
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save changes"}
          </Button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Current category</p>
            <p className="mt-2 text-sm text-white">{getCampaignCategoryLabel(category)}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Available wallet</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(walletBalance)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Already used budget</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(spentBudget)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Projected slots</p>
              <p className="mt-2 text-lg font-semibold text-white">{stats.projectedSlots}</p>
              <p className="mt-1 text-xs text-white/45">Used submissions already locked: {campaign.submissionCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Projected remaining budget</p>
              <p className="mt-2 text-lg font-semibold text-white">
                INR {formatMoney(stats.projectedRemaining)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Wallet impact</p>
            {stats.topUpAmount > 0 ? (
              <p className="mt-2 text-sm text-amber-100">
                This update needs an additional INR {formatMoney(stats.topUpAmount)} from the business wallet.
              </p>
            ) : stats.releaseAmount > 0 ? (
              <p className="mt-2 text-sm text-emerald-200">
                This update releases INR {formatMoney(stats.releaseAmount)} back to the business wallet.
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/65">No wallet change for this update.</p>
            )}
            <p className="mt-2 text-xs text-white/45">
              Projected wallet after save: INR {formatMoney(stats.projectedWallet)}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>Projected total slots: {stats.projectedSlots}</p>
            <p className="mt-1">Final payable amount after this edit: INR {formatMoney(Math.max(0, stats.topUpAmount))}</p>
            <p className="mt-1">Platform fee on campaign edit: INR 0.00</p>
          </div>

          {stats.insufficient ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              The wallet does not have enough balance to apply this budget increase.
            </div>
          ) : null}

          {stats.invalidUsedSlots ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              This update would reduce total slots below the number of submissions already recorded.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

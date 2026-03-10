"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  CAMPAIGN_TASK_TYPE_OPTIONS,
  getCampaignCategoryLabel,
} from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";

const DEFAULT_CATEGORY = "marketing";

export default function CreateCampaign() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [taskType, setTaskType] = useState(CAMPAIGN_TASK_TYPE_OPTIONS[DEFAULT_CATEGORY][0]);
  const [taskLink, setTaskLink] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [reward, setReward] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const taskOptions = useMemo(
    () => CAMPAIGN_TASK_TYPE_OPTIONS[category] || CAMPAIGN_TASK_TYPE_OPTIONS[DEFAULT_CATEGORY],
    [category]
  );
  const rewardValue = Number(reward) || 0;
  const budgetValue = Number(budget) || 0;
  const totalSlots = rewardValue > 0 ? Math.floor(budgetValue / rewardValue) : 0;
  const finalPayableAmount = budgetValue;
  const hasEnoughWallet = walletBalance === null ? null : walletBalance >= finalPayableAmount;

  useEffect(() => {
    let active = true;

    async function loadFundingState() {
      const res = await fetch("/api/v2/business/funding", { credentials: "include" });
      const raw = await res.text();

      if (!active) return;

      try {
        const data = raw ? (JSON.parse(raw) as { wallet?: { balance?: number } }) : {};
        setWalletBalance(data.wallet?.balance ?? 0);
      } catch {
        setWalletBalance(0);
      }
    }

    void loadFundingState();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit() {
    if (totalSlots < 1) {
      setError("Budget must be enough to fund at least one slot.");
      return;
    }

    if (hasEnoughWallet === false) {
      setError("Insufficient wallet balance for this campaign budget.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const detailsLines = taskDetails
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const res = await fetch("/api/v2/business/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: `${taskType}: ${description}`,
        category,
        taskLink: taskLink || null,
        rewardPerTask: Number(reward),
        totalBudget: Number(budget),
        instructions: detailsLines,
      }),
    });

    const raw = await res.text();
    let data: { error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create campaign");
      return;
    }

    setMessage("Campaign created successfully!");
    setTitle("");
    setDescription("");
    setCategory(DEFAULT_CATEGORY);
    setTaskType(CAMPAIGN_TASK_TYPE_OPTIONS[DEFAULT_CATEGORY][0]);
    setTaskLink("");
    setTaskDetails("");
    setReward("");
    setBudget("");
    setWalletBalance((current) => (current === null ? current : Math.max(0, current - budgetValue)));
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Campaign setup</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Create Campaign</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Launch a structured campaign with clear task type, instructions, reward, and total budget.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Task Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize what the participant needs to do"
              className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setCategory(nextCategory);
                  setTaskType((CAMPAIGN_TASK_TYPE_OPTIONS[nextCategory] || [])[0] || "");
                }}
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
              <label className="text-sm font-medium text-white/80">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {taskOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Task Link</label>
            <Input
              value={taskLink}
              onChange={(e) => setTaskLink(e.target.value)}
              placeholder="Optional destination link"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Task Details</label>
            <textarea
              value={taskDetails}
              onChange={(e) => setTaskDetails(e.target.value)}
              placeholder={"Add one instruction per line\nExample:\nOpen the app store\nInstall the app\nShare screenshot proof"}
              className="min-h-36 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <p className="text-xs text-white/45">Each new line becomes a separate instruction step.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Per Task Reward</label>
              <Input
                type="number"
                min="1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="Reward per approved task"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Total Budget</label>
              <Input
                type="number"
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Total budget"
              />
            </div>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            className="w-full"
            disabled={loading || hasEnoughWallet === false || totalSlots < 1}
          >
            {loading ? "Launching..." : "Launch Campaign"}
          </Button>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

          {error.includes("Insufficient wallet balance") ? (
            <Link
              href="/dashboard/business/funding"
              className="inline-block text-sm text-white underline underline-offset-4"
            >
              Add funds to wallet
            </Link>
          ) : null}
        </div>

        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div>
            <p className="text-sm text-white/60">Campaign preview</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{title || "Untitled campaign"}</h3>
            <p className="mt-2 text-sm text-white/60">
              {description || "Your task summary will appear here for business review."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Category</p>
            <p className="mt-2 text-sm text-white">{getCampaignCategoryLabel(category)}</p>
            <p className="mt-1 text-sm text-white/60">{taskType}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Task details</p>
            {taskDetails.trim() ? (
              <ol className="mt-3 space-y-2 text-sm text-white/75">
                {taskDetails
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, index) => (
                    <li key={`${line}-${index}`}>{index + 1}. {line}</li>
                  ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-white/45">No instruction lines added yet.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Per task reward</p>
              <p className="mt-2 text-lg font-semibold text-emerald-200">
                INR {formatMoney(rewardValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Total budget</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(budgetValue)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Calculated total slots</p>
              <p className="mt-2 text-lg font-semibold text-white">{totalSlots}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Available wallet</p>
              <p className="mt-2 text-lg font-semibold text-white">
                INR {formatMoney(walletBalance ?? 0)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            <p>Estimated platform fee: INR 0.00</p>
            <p className="mt-2">Final payable amount: INR {formatMoney(finalPayableAmount)}</p>
            <p className="mt-2">
              Wallet sufficiency:{" "}
              {hasEnoughWallet === null ? "Checking..." : hasEnoughWallet ? "Sufficient" : "Insufficient"}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/55">
            Marketing campaigns use the marketing commission rules. Work-based campaigns use the default
            non-marketing commission rules already configured in the platform.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  getCampaignCategoryLabel,
} from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import {
  DEFAULT_TASK_CATEGORIES,
  type TaskCategoryOption,
  getEffectiveTaskLabel,
  getTaskTypesForCategory,
  isValidTaskCategory,
  isValidTaskType,
} from "@/lib/task-categories";

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
    taskCategory: string;
    taskType: string;
    customTask: string | null;
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
  const t = useTranslations("business.campaignEditor");
  const tCategories = useTranslations("business.categories");
  const router = useRouter();
  const [taskCategories, setTaskCategories] = useState<TaskCategoryOption[]>(DEFAULT_TASK_CATEGORIES);
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [category, setCategory] = useState(campaign.category);
  const [taskCategory, setTaskCategory] = useState<string>(campaign.taskCategory);
  const [taskType, setTaskType] = useState<string>(campaign.taskType);
  const [customTask, setCustomTask] = useState(campaign.customTask || "");
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
  const taskTypeOptions = useMemo(
    () => getTaskTypesForCategory(taskCategory, taskCategories),
    [taskCategory, taskCategories]
  );
  const needsCustomTask = taskType === "Other";
  const effectiveTaskLabel = getEffectiveTaskLabel(taskType, customTask);

  useEffect(() => {
    let active = true;
    async function loadTaskCategories() {
      const res = await fetch("/api/task-categories", { credentials: "include" });
      const raw = await res.text();
      if (!active) return;
      try {
        const data = raw ? (JSON.parse(raw) as { taskCategories?: TaskCategoryOption[] }) : {};
        if (data.taskCategories?.length) {
          setTaskCategories(data.taskCategories);
          if (!isValidTaskCategory(taskCategory, data.taskCategories)) {
            const nextTaskCategory = data.taskCategories[0]?.name || "Other";
            setTaskCategory(nextTaskCategory);
            setTaskType(getTaskTypesForCategory(nextTaskCategory, data.taskCategories)[0] || "Other");
          } else if (!isValidTaskType(taskCategory, taskType, data.taskCategories)) {
            setTaskType(getTaskTypesForCategory(taskCategory, data.taskCategories)[0] || "Other");
          }
        }
      } catch {
        // keep defaults
      }
    }
    void loadTaskCategories();
    return () => {
      active = false;
    };
  }, [taskCategory, taskType]);

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

    if (needsCustomTask && !customTask.trim()) {
      setLoading(false);
      setError(t("errors.customTaskRequired"));
      return;
    }

    const res = await fetch(`/api/v2/business/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        category,
        taskCategory,
        taskType,
        customTask: needsCustomTask ? customTask.trim() : null,
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
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || t("errors.failedToUpdate"));
      return;
    }

    setMessage(data.message || t("messages.updated"));
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
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setDupLoading(false);

    if (!res.ok) {
      setError(data.error || t("errors.failedToDuplicate"));
      return;
    }

    setMessage(data.message || t("messages.duplicated"));
    emitDashboardLiveRefresh();
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-white/60">{t("header.eyebrow")}</p>
          <h3 className="text-2xl font-semibold text-white">{t("header.title")}</h3>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            {t("header.subtitle")}
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => void duplicateCampaign()} disabled={dupLoading} className="w-full sm:w-auto">
          <Copy size={16} />
          {dupLoading ? t("actions.duplicating") : t("actions.duplicate")}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("fields.title")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("placeholders.title")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("fields.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              placeholder={t("placeholders.description")}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.campaignCategory")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {CAMPAIGN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getCampaignCategoryLabel(option.value, tCategories)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.taskCategory")}</label>
              <select
                value={taskCategory}
                onChange={(e) => {
                  const nextTaskCategory = e.target.value;
                  setTaskCategory(nextTaskCategory);
                  setTaskType(getTaskTypesForCategory(nextTaskCategory, taskCategories)[0] || "Other");
                  setCustomTask("");
                }}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {taskCategories.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.taskType")}</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {taskTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {needsCustomTask ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.customTask")}</label>
              <Input
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                placeholder={t("placeholders.customTask")}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("fields.taskLink")}</label>
            <Input
              value={taskLink}
              onChange={(e) => setTaskLink(e.target.value)}
              placeholder={t("placeholders.taskLink")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("fields.instructions")}</label>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              className="min-h-36 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              placeholder={t("placeholders.instructions")}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.rewardPerTask")}</label>
              <Input
                type="number"
                min="1"
                value={rewardPerTask}
                onChange={(e) => setRewardPerTask(e.target.value)}
                placeholder={t("placeholders.rewardPerTask")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("fields.totalBudget")}</label>
              <Input
                type="number"
                min={spentBudget > 0 ? spentBudget.toFixed(2) : "1"}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder={t("placeholders.totalBudget")}
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
            {loading ? t("actions.saving") : t("actions.save")}
          </Button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.currentCategory")}</p>
            <p className="mt-2 text-sm text-white">{getCampaignCategoryLabel(category, tCategories)}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{t("side.currentTaskCategory")}</p>
            <p className="mt-2 text-sm text-white">{taskCategory}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{t("side.currentTaskType")}</p>
            <p className="mt-2 text-sm text-white">{effectiveTaskLabel}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.availableWallet")}</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(walletBalance)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.usedBudget")}</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(spentBudget)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.projectedSlots")}</p>
              <p className="mt-2 text-lg font-semibold text-white">{stats.projectedSlots}</p>
              <p className="mt-1 text-xs text-white/45">{t("side.usedSubmissionsLocked", { count: campaign.submissionCount })}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.projectedRemainingBudget")}</p>
              <p className="mt-2 text-lg font-semibold text-white">
                INR {formatMoney(stats.projectedRemaining)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("side.walletImpact")}</p>
            {stats.topUpAmount > 0 ? (
            <p className="mt-2 break-words text-sm text-amber-100">
                {t("side.walletImpactTopUp", { amount: formatMoney(stats.topUpAmount) })}
              </p>
            ) : stats.releaseAmount > 0 ? (
              <p className="mt-2 break-words text-sm text-emerald-200">
                {t("side.walletImpactRelease", { amount: formatMoney(stats.releaseAmount) })}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/65">{t("side.walletImpactNone")}</p>
            )}
            <p className="mt-2 text-xs text-white/45">
              {t("side.projectedWalletAfterSave", { amount: formatMoney(stats.projectedWallet) })}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/60">
            <p>{t("side.summary.projectedTotalSlots", { count: stats.projectedSlots })}</p>
            <p className="mt-1">{t("side.summary.finalPayable", { amount: formatMoney(Math.max(0, stats.topUpAmount)) })}</p>
            <p className="mt-1">{t("side.summary.platformFee")}</p>
          </div>

          {stats.insufficient ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {t("warnings.insufficientWallet")}
            </div>
          ) : null}

          {stats.invalidUsedSlots ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {t("warnings.invalidUsedSlots")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

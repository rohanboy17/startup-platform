"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  getCampaignCategoryLabel,
} from "@/lib/campaign-options";
import { formatMoney } from "@/lib/format-money";
import {
  TASK_CATEGORIES,
  getEffectiveTaskLabel,
  getTaskTypesForCategory,
} from "@/lib/task-categories";

const DEFAULT_CATEGORY = "marketing";
const DEFAULT_TASK_CATEGORY = TASK_CATEGORIES[0].name;

export default function CreateCampaign() {
  const tBusiness = useTranslations("business");
  const t = useTranslations("business.create");
  const tCategories = useTranslations("business.categories");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [taskCategory, setTaskCategory] = useState<string>(DEFAULT_TASK_CATEGORY);
  const [taskType, setTaskType] = useState<string>(getTaskTypesForCategory(DEFAULT_TASK_CATEGORY)[0] || "Other");
  const [customTask, setCustomTask] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [reward, setReward] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<
    "" | "KYC_NOT_VERIFIED" | "MIN_ONE_SLOT" | "INSUFFICIENT_WALLET" | "CREATE_FAILED"
  >("");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const taskOptions = useMemo(() => getTaskTypesForCategory(taskCategory), [taskCategory]);
  const needsCustomTask = taskType === "Other";
  const effectiveTaskLabel = getEffectiveTaskLabel(taskType, customTask);
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

    async function loadKycStatus() {
      const res = await fetch("/api/v2/business/settings", { credentials: "include" });
      const raw = await res.text();
      if (!active) return;
      try {
        const data = raw ? (JSON.parse(raw) as { profile?: { kycStatus?: string } }) : {};
        setKycStatus(data.profile?.kycStatus || "PENDING");
      } catch {
        setKycStatus("PENDING");
      }
    }

    void loadFundingState();
    void loadKycStatus();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit() {
    if (kycStatus && kycStatus !== "VERIFIED") {
      setError(t("errors.kycNotVerified"));
      setErrorCode("KYC_NOT_VERIFIED");
      return;
    }

    if (totalSlots < 1) {
      setError(t("errors.minOneSlot"));
      setErrorCode("MIN_ONE_SLOT");
      return;
    }

    if (hasEnoughWallet === false) {
      setError(t("errors.insufficientWallet"));
      setErrorCode("INSUFFICIENT_WALLET");
      return;
    }

    if (needsCustomTask && !customTask.trim()) {
      setError(t("errors.customTaskRequired"));
      setErrorCode("CREATE_FAILED");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    setErrorCode("");

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
        description,
        category,
        taskCategory,
        taskType,
        customTask: needsCustomTask ? customTask.trim() : null,
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
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || t("errors.failedToCreate"));
      setErrorCode("CREATE_FAILED");
      return;
    }

    setMessage(t("messages.created"));
    setTitle("");
    setDescription("");
    setCategory(DEFAULT_CATEGORY);
    setTaskCategory(DEFAULT_TASK_CATEGORY);
    setTaskType(getTaskTypesForCategory(DEFAULT_TASK_CATEGORY)[0] || "Other");
    setCustomTask("");
    setTaskLink("");
    setTaskDetails("");
    setReward("");
    setBudget("");
    setWalletBalance((current) => (current === null ? current : Math.max(0, current - budgetValue)));
    setErrorCode("");
  }

  const kycBlocked = Boolean(kycStatus && kycStatus !== "VERIFIED");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("header.eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{tBusiness("createPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          {t("header.subtitle")}
        </p>
      </div>

      {kycBlocked ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">{t("kycBlocked.title")}</p>
          <p className="mt-2 text-amber-100/80">
            {t("kycBlocked.body", { status: kycStatus || "PENDING" })}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/dashboard/business/settings"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 px-4 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
            >
              {t("kycBlocked.reviewSettings")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 px-4 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
            >
              {t("kycBlocked.contactSupport")}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("form.title")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("placeholders.title")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("form.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("placeholders.description")}
              className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("form.campaignCategory")}</label>
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
              <label className="text-sm font-medium text-white/80">{t("form.taskCategory")}</label>
              <select
                value={taskCategory}
                onChange={(e) => {
                  const nextTaskCategory = e.target.value;
                  setTaskCategory(nextTaskCategory);
                  setTaskType(getTaskTypesForCategory(nextTaskCategory)[0] || "Other");
                  setCustomTask("");
                }}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {TASK_CATEGORIES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("form.taskType")}</label>
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

          {needsCustomTask ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("form.customTask")}</label>
              <Input
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                placeholder={t("placeholders.customTask")}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("form.taskLink")}</label>
            <Input
              value={taskLink}
              onChange={(e) => setTaskLink(e.target.value)}
              placeholder={t("placeholders.taskLink")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t("form.taskDetails")}</label>
            <textarea
              value={taskDetails}
              onChange={(e) => setTaskDetails(e.target.value)}
              placeholder={t("placeholders.taskDetails")}
              className="min-h-36 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <p className="text-xs text-white/45">{t("form.taskDetailsHelp")}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("form.rewardPerTask")}</label>
              <Input
                type="number"
                min="1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder={t("placeholders.rewardPerTask")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t("form.totalBudget")}</label>
              <Input
                type="number"
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={t("placeholders.totalBudget")}
              />
            </div>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            className="w-full"
            disabled={loading || hasEnoughWallet === false || totalSlots < 1 || kycBlocked}
          >
            {loading ? t("actions.launching") : t("actions.launch")}
          </Button>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

          {errorCode === "INSUFFICIENT_WALLET" ? (
            <Link
              href="/dashboard/business/funding"
              className="inline-block text-sm text-white underline underline-offset-4"
            >
              {t("actions.addFundsLink")}
            </Link>
          ) : null}
        </div>

          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6">
            <div>
              <p className="text-sm text-white/60">{t("preview.eyebrow")}</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{title || t("preview.untitled")}</h3>
              <p className="mt-2 text-sm text-white/60">
              {description || t("preview.descriptionFallback")}
              </p>
            </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.categoryLabel")}</p>
            <p className="mt-2 text-sm text-white">{getCampaignCategoryLabel(category, tCategories)}</p>
            <p className="mt-1 text-sm text-white/60">
              {t("preview.taskCategoryLabel")}: {taskCategory}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {t("preview.taskTypeLabel")}: {effectiveTaskLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.taskDetailsLabel")}</p>
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
              <p className="mt-3 text-sm text-white/45">{t("preview.noInstructions")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.rewardPerTask")}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-200">
                INR {formatMoney(rewardValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.totalBudget")}</p>
              <p className="mt-2 text-lg font-semibold text-white">INR {formatMoney(budgetValue)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.totalSlots")}</p>
              <p className="mt-2 text-lg font-semibold text-white">{totalSlots}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("preview.availableWallet")}</p>
              <p className="mt-2 text-lg font-semibold text-white">
                INR {formatMoney(walletBalance ?? 0)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            <p>{t("preview.estimatedFee")}</p>
            <p className="mt-2">{t("preview.finalPayable", { amount: formatMoney(finalPayableAmount) })}</p>
            <p className="mt-2">
              {t("preview.walletSufficiency")}:{" "}
              {hasEnoughWallet === null ? t("preview.checking") : hasEnoughWallet ? t("preview.sufficient") : t("preview.insufficient")}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/55">
            {t("preview.commissionHint")}
          </div>
        </div>
      </div>
    </div>
  );
}

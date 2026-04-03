"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { normalizeExternalUrl } from "@/lib/external-url";
import { useLiveRefresh } from "@/lib/live-refresh";
import EmptyCampaignsPushNudge from "@/components/empty-campaigns-push-nudge";
import { getEffectiveTaskLabel } from "@/lib/task-categories";

type Campaign = {
  id: string;
  createdAt?: string;
  title: string;
  description: string;
  category: string;
  taskCategory: string;
  taskType: string;
  customTask: string | null;
  taskLink: string | null;
  rewardPerTask: number;
  remainingBudget: number;
  totalBudget: number;
  allowedSubmissions: number;
  usedSubmissions: number;
  leftSubmissions: number;
  userSubmissionCount: number;
  blockedBySubmissionMode: boolean;
  blockedByRepeatRule: boolean;
  repeatAccessMode:
    | "OPEN"
    | "REQUESTED_ONLY"
    | "REQUESTED_PLUS_NEW"
    | "FRESH_CAMPAIGN_ONLY"
    | "FRESH_PLATFORM_ONLY";
  repeatRequestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  repeatRequestReason: string | null;
  submissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
  effectiveLevel: "L1" | "L2" | "L3" | "L4" | "L5";
  commissionRate: number;
  walletShareRate: number;
  netRewardPerTask: number;
  netRemainingBudget: number;
  netTotalBudget: number;
};

export default function UserCampaignsPanel() {
  const t = useTranslations("user.tasks");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recommendationBoost, setRecommendationBoost] = useState<{ active: boolean; endsAt: string | null } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/campaigns", { credentials: "include" });
    const raw = await res.text();
    let data: {
      campaigns?: Campaign[];
      recommendationBoost?: { active: boolean; endsAt: string | null };
      error?: string;
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as { campaigns?: Campaign[]; error?: string }) : {};
    } catch {
      data = { error: t("unexpected") };
    }
    if (!res.ok) {
      setError(data.error || t("failed"));
    } else {
      setError("");
      setCampaigns(data.campaigns || []);
      setRecommendationBoost(data.recommendationBoost || null);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  if (loading) {
    return <p className="text-sm text-white/60">{t("loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {recommendationBoost?.active ? (
        <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          {t("recommendationBoostActive", {
            date: recommendationBoost.endsAt
              ? new Date(recommendationBoost.endsAt).toLocaleString()
              : "",
          })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
      {campaigns.length === 0 ? (
        <div className="py-20 text-center text-white/50 md:col-span-2">
          <p>{t("empty")}</p>
          <EmptyCampaignsPushNudge />
        </div>
      ) : (
        campaigns.map((campaign) => {
          const taskLabel = getEffectiveTaskLabel(campaign.taskType, campaign.customTask);
          return (
            <Card
              key={campaign.id}
              className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-[1.02] hover:shadow-xl hover:ring-1 hover:ring-white/20"
            >
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold sm:text-xl">{campaign.title}</h3>
                  <span className="text-xs text-white/60">{campaign.category}</span>
                </div>
                <p className="text-xs text-white/45">
                  {campaign.taskCategory} | {taskLabel}
                </p>
                <p className="text-sm text-white/60">{campaign.description}</p>
                {campaign.taskLink ? (
                  <a
                    href={normalizeExternalUrl(campaign.taskLink) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-300 underline"
                  >
                    {t("openTaskLink")}
                  </a>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-bold text-green-400">
                      INR {formatMoney(campaign.netRewardPerTask)}
                    </span>
                    <p className="mt-1 text-xs text-white/60">
                      {t("walletRewardHint", {
                        level: campaign.effectiveLevel,
                        percent: Math.round(campaign.walletShareRate * 100),
                      })}
                    </p>
                  </div>
                  <div className="text-xs text-white/60 sm:text-right">
                    <p>{t("budgetLeft", { amount: formatMoney(campaign.netRemainingBudget) })}</p>
                    <p className="mt-1">{t("budgetTotal", { amount: formatMoney(campaign.netTotalBudget) })}</p>
                  </div>
                </div>
                <p className="text-xs text-white/60">
                  {t("allowed")}: {campaign.allowedSubmissions}
                  <span className="mx-1 hidden sm:inline">|</span>
                  <span className="block sm:inline">{t("used")}: {campaign.usedSubmissions}</span>
                  <span className="mx-1 hidden sm:inline">|</span>
                  <span className="block sm:inline">{t("slotsLeft")}: {campaign.leftSubmissions}</span>
                </p>
                <p className="text-xs text-white/60">
                  {campaign.submissionMode === "ONE_PER_USER"
                    ? t("onePerUser")
                    : t("manyPerUser")}
                </p>
                {campaign.blockedBySubmissionMode ? (
                  <p className="text-xs text-amber-200">
                    {campaign.blockedByRepeatRule
                      ? campaign.repeatRequestStatus === "PENDING"
                        ? t("repeatPending")
                        : campaign.repeatRequestReason === "requested_users_only"
                          ? t("requestedUsersOnly")
                          : campaign.repeatRequestReason === "fresh_same_campaign_only"
                            ? t("freshCampaignOnly")
                            : campaign.repeatRequestReason === "fresh_platform_only"
                              ? t("freshPlatformOnly")
                          : t("repeatRequestNeeded")
                      : t("blocked")}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/dashboard/user/tasks/${campaign.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
                  >
                    {t("viewTask")}
                  </Link>
                  <Link
                    href={`/dashboard/user/tasks/${campaign.id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
                      campaign.blockedBySubmissionMode
                        ? "border border-white/10 bg-white/5 text-white/45"
                        : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                    }`}
                  >
                    {campaign.blockedBySubmissionMode ? t("alreadySubmitted") : t("startTask")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
      </div>
    </div>
  );
}

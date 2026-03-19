"use client";

import { useCallback, useMemo, useState } from "react";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import WithdrawRequestCard from "@/components/withdraw-request-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useTranslations } from "next-intl";

type WithdrawalItem = {
  id: string;
  amount: number;
  upiId?: string | null;
  upiName?: string | null;
  status: string;
  adminNote?: string | null;
  isEmergency?: boolean;
  createdAt: string;
};

type WithdrawalsPayload = {
  balance: number;
  metrics: {
    pendingAmount: number;
    approvedAmount: number;
    rejectedCount: number;
    totalRequests: number;
    emergencyRemaining: number;
    emergencyUsed: number;
  };
  withdrawals: WithdrawalItem[];
  error?: string;
};

export default function UserWithdrawalsLive({ minAmount }: { minAmount: number }) {
  const t = useTranslations("user.withdrawals");
  const [data, setData] = useState<WithdrawalsPayload | null>(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/withdrawals", { cache: "no-store" });
    const raw = await res.text();
    let parsed: WithdrawalsPayload | { error?: string } = { error: "Unexpected response" };
    try {
      parsed = raw ? (JSON.parse(raw) as WithdrawalsPayload) : parsed;
    } catch {
      parsed = { error: "Unexpected response" };
    }

    if (!res.ok) {
      setError((parsed as { error?: string }).error || t("failed"));
      return;
    }

    setError("");
    setData(parsed as WithdrawalsPayload);
  }, [t]);

  useLiveRefresh(load, 8000);

  const visibleWithdrawals = useMemo(
    () => (limit === "ALL" ? data?.withdrawals ?? [] : (data?.withdrawals ?? []).slice(0, Number(limit))),
    [data?.withdrawals, limit]
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 min-[1500px]:grid-cols-5">
        <KpiCard label={t("kpiAvailable")} value={`INR ${formatMoney(data?.balance)}`} tone="success" />
        <KpiCard label={t("kpiPending")} value={`INR ${formatMoney(data?.metrics.pendingAmount)}`} tone="warning" />
        <KpiCard label={t("kpiApproved")} value={`INR ${formatMoney(data?.metrics.approvedAmount)}`} tone="info" />
        <KpiCard label={t("kpiRejected")} value={data?.metrics.rejectedCount ?? 0} tone="danger" />
        <KpiCard label={t("kpiEmergency")} value={data?.metrics.emergencyRemaining ?? 2} tone="info" />
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[0.9fr_1.1fr]">
        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">{t("requestEyebrow")}</p>
              <h3 className="text-xl font-semibold text-white">{t("requestTitle")}</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
              <p>{t("ruleMin", { amount: formatMoney(minAmount) })}</p>
              <p className="mt-2">{t("ruleOnePending")}</p>
              <p className="mt-2">{t("ruleAdminReview")}</p>
              <p className="mt-2">
                {t("ruleEmergency")}
              </p>
            </div>

            <WithdrawRequestCard
              minAmount={minAmount}
              availableBalance={data?.balance}
              emergencyRemaining={data?.metrics.emergencyRemaining}
            />
        </SectionCard>

        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/60">{t("historyEyebrow")}</p>
                <h3 className="text-xl font-semibold text-white">{t("historyTitle")}</h3>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <span>{t("controls.show")}</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="ALL">{t("controls.showAll")}</option>
                  </select>
                </label>
                <StatusBadge label={t("totalRequests", { count: data?.metrics.totalRequests ?? 0 })} tone="neutral" />
              </div>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            {!data ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                {t("loadingHistory")}
              </div>
            ) : data.withdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
                {t("noHistory")}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleWithdrawals.map((w) => (
                  <div key={w.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{t("requestLabel")}</p>
                        <p className="text-sm text-white/50">{new Date(w.createdAt).toLocaleString()}</p>
                        {(w.upiId || w.upiName) ? (
                          <p className="mt-2 break-all text-xs text-white/40">
                            {w.upiName || t("upiFallback")} | {w.upiId || "-"}
                          </p>
                        ) : null}
                        {w.isEmergency ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-violet-200">
                            {t("emergencyLabel")}
                          </p>
                        ) : null}
                      </div>
                      <div className="lg:text-right">
                        <p className="text-lg font-semibold text-white">INR {formatMoney(w.amount)}</p>
                        <div className="mt-2">
                          <StatusBadge
                            label={w.status}
                            tone={w.status === "APPROVED" ? "success" : w.status === "REJECTED" ? "danger" : "warning"}
                          />
                        </div>
                      </div>
                    </div>
                    {w.adminNote ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                        {t("adminNote", { note: w.adminNote })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
        </SectionCard>
      </div>
    </div>
  );
}

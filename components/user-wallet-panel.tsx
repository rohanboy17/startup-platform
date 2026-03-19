"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useTranslations } from "next-intl";

type WalletResponse = {
  balance: number;
  totals: {
    earned: number;
    withdrawn: number;
    pendingWithdrawal: number;
  };
  transactions: Array<{
    id: string;
    note: string | null;
    createdAt: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
  }>;
  error?: string;
};

export default function UserWalletPanel() {
  const t = useTranslations("user.wallet");
  const [data, setData] = useState<WalletResponse | null>(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/wallet", { credentials: "include" });
    const raw = await res.text();
    let parsed: WalletResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as WalletResponse) : null;
    } catch {
      setError(t("unexpected"));
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || t("failed"));
      return;
    }

    setError("");
    setData(parsed);
  }, [t]);

  useLiveRefresh(load, 10000);

  const visibleTransactions = useMemo(
    () => (limit === "ALL" ? data?.transactions ?? [] : (data?.transactions ?? []).slice(0, Number(limit))),
    [data?.transactions, limit]
  );

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">{t("loading")}</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
            {t("subtitle")}
          </p>
        </div>
        <Link
          href="/dashboard/user/withdrawals"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
        >
          <ArrowUpRight size={16} />
          {t("openWithdrawals")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpiAvailable")} value={`INR ${formatMoney(data.balance)}`} tone="success" />
        <KpiCard label={t("kpiEarned")} value={`INR ${formatMoney(data.totals.earned)}`} />
        <KpiCard label={t("kpiDebited")} value={`INR ${formatMoney(data.totals.withdrawn)}`} />
        <KpiCard label={t("kpiPending")} value={`INR ${formatMoney(data.totals.pendingWithdrawal)}`} tone="warning" />
      </div>

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
              <StatusBadge label={t("latestEntries")} tone="neutral" />
            </div>
          </div>

          {data.transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
              {t("noTransactions")}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTransactions.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-white break-words">{tx.note || t("txFallback")}</p>
                    <p className="text-sm text-white/50">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`kpi-value shrink-0 ${tx.type === "CREDIT" ? "text-emerald-300" : "text-rose-300"} sm:text-right`}>
                    {tx.type === "CREDIT" ? "+" : "-"} INR {formatMoney(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
      </SectionCard>
    </div>
  );
}

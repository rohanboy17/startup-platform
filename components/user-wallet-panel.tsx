"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

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
  const [data, setData] = useState<WalletResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/wallet", { credentials: "include" });
    const raw = await res.text();
    let parsed: WalletResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as WalletResponse) : null;
    } catch {
      setError("Unexpected server response");
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load wallet");
      return;
    }

    setError("");
    setData(parsed);
  }, []);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading wallet...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Money center</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Wallet</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
            Review your available balance, earning history, and payout movement in one place.
          </p>
        </div>
        <Link
          href="/dashboard/user/withdrawals"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
        >
          <ArrowUpRight size={16} />
          Open withdrawals
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Available balance</p>
              <Wallet size={18} className="text-emerald-300" />
            </div>
            <p className="text-3xl font-semibold text-emerald-300">INR {formatMoney(data.balance)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Total earned</p>
            <p className="text-3xl font-semibold text-white">INR {formatMoney(data.totals.earned)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-white/60">Total debited</p>
            <p className="text-3xl font-semibold text-white">INR {formatMoney(data.totals.withdrawn)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Pending payout</p>
              <Clock3 size={18} className="text-amber-300" />
            </div>
            <p className="text-3xl font-semibold text-amber-200">INR {formatMoney(data.totals.pendingWithdrawal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/60">Transaction history</p>
              <h3 className="text-xl font-semibold text-white">Credits and debits</h3>
            </div>
            <p className="text-sm text-white/50">Latest 20 wallet entries</p>
          </div>

          {data.transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/55">
              No wallet transactions yet. Approved rewards and withdrawals will show here.
            </div>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-white break-words">{tx.note || "Wallet transaction"}</p>
                    <p className="text-sm text-white/50">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 ${tx.type === "CREDIT" ? "text-emerald-300" : "text-rose-300"} sm:text-right`}>
                    {tx.type === "CREDIT" ? "+" : "-"} INR {formatMoney(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import WithdrawRequestCard from "@/components/withdraw-request-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type WithdrawalItem = {
  id: string;
  amount: number;
  upiId?: string | null;
  upiName?: string | null;
  status: string;
  createdAt: string;
};

type WithdrawalsPayload = {
  balance: number;
  withdrawals: WithdrawalItem[];
};

export default function UserWithdrawalsLive({ minAmount }: { minAmount: number }) {
  const [data, setData] = useState<WithdrawalsPayload | null>(null);
  const [error, setError] = useState("");

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
      setError((parsed as { error?: string }).error || "Failed to load withdrawals");
      return;
    }

    setError("");
    setData(parsed as WithdrawalsPayload);
  }, []);

  useLiveRefresh(load, 8000);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold md:text-3xl">Withdrawals</h2>
      <p className="text-sm text-white/60">
        Current wallet balance: INR {formatMoney(data?.balance)}
      </p>

      <WithdrawRequestCard minAmount={minAmount} />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="divide-y divide-white/10 rounded-2xl bg-white/5">
        {!data ? (
          <div className="p-6 text-sm text-white/60">Loading withdrawal history...</div>
        ) : data.withdrawals.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No withdrawal history yet.</div>
        ) : (
          data.withdrawals.map((w) => (
            <div key={w.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between sm:p-6">
              <div>
                <p className="font-medium">Withdrawal Request</p>
                <p className="text-sm text-white/50">{new Date(w.createdAt).toLocaleDateString()}</p>
                {(w.upiId || w.upiName) ? (
                  <p className="break-all text-xs text-white/40">
                    {w.upiName || "UPI"} | {w.upiId || "-"}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p>INR {formatMoney(w.amount)}</p>
                <p className="text-sm text-white/60">{w.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

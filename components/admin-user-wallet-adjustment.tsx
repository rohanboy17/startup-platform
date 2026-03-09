"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type WalletAction = "CREDIT" | "DEBIT";

export default function AdminUserWalletAdjustment({ userId }: { userId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<WalletAction>("CREDIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitAdjustment() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/wallet`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        amount: Number(amount),
        note,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(false);
    setMessage(data.message || data.error || "Updated");

    if (res.ok) {
      setAmount("");
      setNote("");
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as WalletAction)}
          className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          disabled={loading}
        >
          <option value="CREDIT">CREDIT</option>
          <option value="DEBIT">DEBIT</option>
        </select>
        <Input
          type="number"
          min={0.01}
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="max-w-[180px]"
        />
      </div>
      <Input
        placeholder="Adjustment reason (required)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={submitAdjustment} disabled={loading}>
        {loading ? "Submitting..." : "Create Adjustment Request"}
      </Button>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

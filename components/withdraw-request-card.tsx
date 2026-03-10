"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function WithdrawRequestCard({
  minAmount,
}: {
  minAmount: number;
}) {
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestWithdrawal() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amount: Number(amount),
        upiId,
        upiName,
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
      setMessage(data.error || "Withdrawal request failed");
      return;
    }

    setMessage(data.message || "Withdrawal request created");
    setAmount("");
    setUpiId("");
    setUpiName("");
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">Request Withdrawal</h3>
      <p className="text-sm text-white/60">
        Minimum withdrawal amount: INR {formatMoney(minAmount)}
      </p>
      <Input
        type="number"
        min={minAmount}
        placeholder={`Enter amount (min INR ${formatMoney(minAmount)})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder="Enter UPI ID or Mobile Number"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
      />
      <Input
        placeholder="Enter UPI Name or Banking Name"
        value={upiName}
        onChange={(e) => setUpiName(e.target.value)}
      />
      <Button onClick={requestWithdrawal} disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Withdrawal Request"}
      </Button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

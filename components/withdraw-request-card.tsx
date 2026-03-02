"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WithdrawRequestCard({
  minAmount,
}: {
  minAmount: number;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestWithdrawal() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: Number(amount) }),
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
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold">Request Withdrawal</h3>
      <p className="text-sm text-white/60">Minimum withdrawal amount: INR {minAmount}</p>
      <Input
        type="number"
        min={minAmount}
        placeholder={`Enter amount (min INR ${minAmount})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button onClick={requestWithdrawal} disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Withdrawal Request"}
      </Button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

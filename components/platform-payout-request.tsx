"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlatformPayoutRequest() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/revenue/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
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

    if (!res.ok) {
      setMessage(data.error || "Failed to create payout request");
      return;
    }

    setMessage(data.message || "Payout request created");
    setAmount("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold">Create Owner Payout Request</h3>
      <Input
        type="number"
        placeholder="Amount (INR)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={submit} disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Create Payout Request"}
      </Button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

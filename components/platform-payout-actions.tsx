"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function PlatformPayoutActions({
  payoutId,
  status,
}: {
  payoutId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | "RETRY" | null>(null);
  const [message, setMessage] = useState("");

  async function update(action: "APPROVED" | "REJECTED" | "RETRY") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/revenue/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, note }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || "Action failed");
      return;
    }

    setMessage(data.message || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
        placeholder="Payout note (optional)"
      />
      <div className="flex gap-2">
        {status === "PENDING" ? (
          <>
            <Button onClick={() => update("APPROVED")} disabled={loading !== null}>
              {loading === "APPROVED" ? "Approving..." : "Approve"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => update("REJECTED")}
              disabled={loading !== null}
            >
              {loading === "REJECTED" ? "Rejecting..." : "Reject"}
            </Button>
          </>
        ) : null}
        {status === "REJECTED" ? (
          <Button variant="outline" onClick={() => update("RETRY")} disabled={loading !== null}>
            {loading === "RETRY" ? "Retrying..." : "Retry"}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

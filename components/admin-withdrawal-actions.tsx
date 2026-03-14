"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminWithdrawalActions({
  withdrawalId,
}: {
  withdrawalId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [message, setMessage] = useState("");

  async function review(action: "APPROVED" | "REJECTED") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
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
        className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        placeholder="Admin note (optional)"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => review("APPROVED")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "APPROVED" ? "Approving..." : "Approve"}
        </Button>
        <Button
          variant="destructive"
          onClick={() => review("REJECTED")}
          disabled={loading !== null}
          className="w-full sm:w-auto"
        >
          {loading === "REJECTED" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

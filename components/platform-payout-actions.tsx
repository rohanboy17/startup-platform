"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function PlatformPayoutActions({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [message, setMessage] = useState("");

  async function update(action: "APPROVED" | "REJECTED") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/revenue/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
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
      <div className="flex gap-2">
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
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

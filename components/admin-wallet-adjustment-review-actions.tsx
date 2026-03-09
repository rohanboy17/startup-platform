"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminWalletAdjustmentReviewActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/finance/adjustments/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reviewNote }),
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
    setReviewNote("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <input
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
        placeholder="Review note (optional)"
      />
      <div className="flex gap-2">
        <Button onClick={() => run("APPROVE")} disabled={loading !== null}>
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </Button>
        <Button variant="destructive" onClick={() => run("REJECT")} disabled={loading !== null}>
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}


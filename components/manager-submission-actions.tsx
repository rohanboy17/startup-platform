"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function ManagerSubmissionActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  async function review(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason }),
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

    setReason("");
    setMessage(data.message || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Rejection reason (required only when rejecting)"
        className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
      />
      <div className="flex gap-3">
        <Button onClick={() => void review("APPROVE")} disabled={loading !== null}>
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </Button>
        <Button variant="destructive" onClick={() => void review("REJECT")} disabled={loading !== null}>
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

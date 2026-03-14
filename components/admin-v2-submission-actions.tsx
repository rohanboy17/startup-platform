"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminV2SubmissionActions({
  submissionId,
  allowReopen = false,
  allowEscalate = false,
}: {
  submissionId: string;
  allowReopen?: boolean;
  allowEscalate?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | "REOPEN" | "ESCALATE" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function review(action: "APPROVE" | "REJECT" | "REOPEN") {
    if (action === "REOPEN" && !reason.trim()) {
      setMessage("Reopen reason is required");
      return;
    }
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason: reason.trim() || undefined }),
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
      setMessage(data.error || "Review failed");
      return;
    }

    setMessage(data.message || "Updated");
    if (action === "REOPEN") {
      setReason("");
    }
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function escalate() {
    setLoading("ESCALATE");
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/escalate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason: reason.trim() || undefined }),
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
      setMessage(data.error || "Escalation failed");
      return;
    }

    setMessage(data.message || "Escalated");
    setReason("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      {(allowReopen || allowEscalate) ? (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          placeholder={allowReopen ? "Reason (required for reopen)" : "Escalation reason (optional)"}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={() => review("APPROVE")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </Button>
        <Button variant="destructive" onClick={() => review("REJECT")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </Button>
        {allowReopen ? (
          <Button variant="outline" onClick={() => review("REOPEN")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "REOPEN" ? "Reopening..." : "Reopen"}
          </Button>
        ) : null}
        {allowEscalate ? (
          <Button variant="secondary" onClick={escalate} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "ESCALATE" ? "Escalating..." : "Escalate"}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminV2SubmissionActions({
  submissionId,
  allowReopen = false,
}: {
  submissionId: string;
  allowReopen?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | "REOPEN" | null>(null);
  const [message, setMessage] = useState("");

  async function review(action: "APPROVE" | "REJECT" | "REOPEN") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/admin`, {
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
      setMessage(data.error || "Review failed");
      return;
    }

    setMessage(data.message || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Button onClick={() => review("APPROVE")} disabled={loading !== null}>
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </Button>
        <Button variant="destructive" onClick={() => review("REJECT")} disabled={loading !== null}>
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </Button>
        {allowReopen ? (
          <Button variant="outline" onClick={() => review("REOPEN")} disabled={loading !== null}>
            {loading === "REOPEN" ? "Reopening..." : "Reopen"}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

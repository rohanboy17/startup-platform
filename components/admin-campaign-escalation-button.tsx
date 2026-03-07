"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminCampaignEscalationButton({
  campaignId,
  mode,
}: {
  campaignId: string;
  mode: "ESCALATE" | "CLEAR_ESCALATION";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: mode,
        reason: mode === "ESCALATE" ? "Escalated from Risk Center" : undefined,
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
    setMessage(data.message || data.error || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" onClick={run} disabled={loading}>
        {loading
          ? mode === "ESCALATE"
            ? "Escalating..."
            : "Clearing..."
          : mode === "ESCALATE"
            ? "Escalate"
            : "Clear Escalation"}
      </Button>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}


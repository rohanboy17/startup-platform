"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminCampaignActions({
  campaignId,
}: {
  campaignId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function update(action: "APPROVE" | "REJECT" | "LIVE" | "COMPLETE") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
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
      setMessage(data.error || "Update failed");
      return;
    }

    setMessage(data.message || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => update("APPROVE")} disabled={loading !== null}>
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </Button>
        <Button onClick={() => update("LIVE")} disabled={loading !== null} variant="secondary">
          {loading === "LIVE" ? "Publishing..." : "Mark Live"}
        </Button>
        <Button variant="destructive" onClick={() => update("REJECT")} disabled={loading !== null}>
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

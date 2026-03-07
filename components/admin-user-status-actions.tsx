"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export default function AdminUserStatusActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: AccountStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AccountStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveStatus() {
    if (status === currentStatus) {
      setMessage("No status change");
      return;
    }
    if ((status === "SUSPENDED" || status === "BANNED") && !reason.trim()) {
      setMessage("Reason is required for suspend or ban");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, reason }),
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountStatus)}
          className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          disabled={loading}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="BANNED">BANNED</option>
        </select>
        <Button onClick={saveStatus} disabled={loading}>
          {loading ? "Saving..." : "Update Status"}
        </Button>
      </div>
      <Input
        placeholder="Status reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

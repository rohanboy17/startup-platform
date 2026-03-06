"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminUserFlagActions({
  userId,
  isSuspicious,
}: {
  userId: string;
  isSuspicious: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: "FLAG" | "UNFLAG") {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/flag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        reason,
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
    <div className="space-y-2">
      {!isSuspicious ? (
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      ) : null}
      <div className="flex gap-2">
        {!isSuspicious ? (
          <Button onClick={() => run("FLAG")} disabled={loading}>
            {loading ? "Flagging..." : "Flag User"}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => run("UNFLAG")} disabled={loading}>
            {loading ? "Updating..." : "Unflag User"}
          </Button>
        )}
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

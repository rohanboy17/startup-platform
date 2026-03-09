"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type BulkItem = {
  id: string;
  label: string;
  fraudScore: number;
};

export default function AdminV2SubmissionBulkActions({ items }: { items: BulkItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function submit() {
    if (selected.length === 0) {
      setMessage("Select submissions first");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/v2/admin/submissions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        submissionIds: selected,
        action,
        reason: reason.trim() || undefined,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string; updated?: number; failed?: number } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Bulk moderation failed");
      return;
    }

    setMessage(`${data.message || "Done"} | Updated: ${data.updated || 0}, Failed: ${data.failed || 0}`);
    setSelected([]);
    setReason("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/70">Bulk Moderation</p>
        <span className="text-xs text-white/60">Selected: {selected.length}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setSelected(items.map((i) => i.id))} disabled={loading}>
          Select All
        </Button>
        <Button type="button" variant="outline" onClick={() => setSelected([])} disabled={loading}>
          Clear
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as "APPROVE" | "REJECT")}
          className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          disabled={loading}
        >
          <option value="APPROVE">APPROVE</option>
          <option value="REJECT">REJECT</option>
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional note"
          className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
          disabled={loading}
        />
      </div>

      <div className="max-h-44 space-y-1 overflow-auto rounded-md border border-white/10 bg-black/20 p-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              disabled={loading}
            />
            <span>
              {item.label} | Fraud: {item.fraudScore}
            </span>
          </label>
        ))}
      </div>

      <Button type="button" onClick={submit} disabled={loading}>
        {loading ? "Processing..." : "Apply Bulk Action"}
      </Button>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}


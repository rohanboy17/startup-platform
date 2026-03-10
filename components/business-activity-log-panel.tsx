"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveRefresh } from "@/lib/live-refresh";

type TimelineItem = {
  id: string;
  kind: "ACTIVITY" | "PAYMENT" | "WALLET";
  action: string;
  actor: string;
  message: string;
  createdAt: string;
};

export default function BusinessActivityLogPanel() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/activity", { credentials: "include" });
    const raw = await res.text();
    let parsed: { timeline?: TimelineItem[]; error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { timeline?: TimelineItem[]; error?: string }) : {};
    } catch {
      setError("Unexpected server response");
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load activity log");
      return;
    }
    setError("");
    setItems(parsed.timeline || []);
  }, []);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-6 text-sm text-white/55">No business activity recorded yet.</CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="space-y-2 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{item.action.replaceAll("_", " ")}</p>
                  <p className="break-all text-xs text-white/45">{item.kind} | {item.actor}</p>
                </div>
                <p className="text-xs text-white/45">
                  {new Date(item.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="break-words text-sm text-white/75">{item.message}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

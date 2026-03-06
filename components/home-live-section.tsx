"use client";

import { useCallback, useState } from "react";
import { useLiveRefresh } from "@/lib/live-refresh";

type LivePayload = {
  stats: {
    activeOnlineUsers: number;
    activeOnlineBusinesses: number;
    liveTasks: number;
    liveWithdraws: number;
  };
  events: Array<{
    kind: "USER" | "BUSINESS" | "TASK" | "WITHDRAW";
    message: string;
    createdAt: string;
  }>;
};

export default function HomeLiveSection() {
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/public/live");
    const raw = await res.text();
    let parsed: LivePayload | { error?: string } = { error: "Unexpected response" };
    try {
      parsed = raw ? (JSON.parse(raw) as LivePayload) : parsed;
    } catch {
      parsed = { error: "Unexpected response" };
    }

    if (!res.ok) {
      setError((parsed as { error?: string }).error || "Failed to load live activity");
      return;
    }

    setError("");
    setData(parsed as LivePayload);
  }, []);

  useLiveRefresh(load, 10000);

  const historyTickerText = data ? data.events.map((event) => event.message).join("   |   ") : "";
  const withdrawTickerText = data
    ? data.events
        .filter((event) => event.kind === "WITHDRAW")
        .map((event) => event.message)
        .join("   |   ")
    : "";

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Live Platform Activity</h2>
            <p className="text-sm text-white/60">Anonymized real-time feed. No personal data shown.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        {!data && !error ? <p className="text-sm text-white/60">Loading live activity...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {data ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-white/60">Active Online Users</p>
                <p className="mt-1 text-xl font-semibold">{data.stats.activeOnlineUsers}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-white/60">Active Online Businesses</p>
                <p className="mt-1 text-xl font-semibold">{data.stats.activeOnlineBusinesses}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-white/60">Live Tasks</p>
                <p className="mt-1 text-xl font-semibold">{data.stats.liveTasks}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-sky-300/80">
                Live Withdraw Requests ({data.stats.liveWithdraws})
              </p>
              <div className="overflow-hidden whitespace-nowrap">
                <div className="inline-block min-w-full pr-6 text-sm text-sky-200 [animation:marquee_20s_linear_infinite]">
                  {withdrawTickerText || "No live withdraw requests right now."}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-emerald-300/80">Activity History</p>
              <div className="overflow-hidden whitespace-nowrap">
                <div className="inline-block min-w-full pr-6 text-sm text-emerald-200 [animation:marquee_20s_linear_infinite]">
                  {historyTickerText || "No recent activity yet. New events will appear here."}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </section>
  );
}

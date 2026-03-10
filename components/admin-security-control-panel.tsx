"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type IpRule = {
  id: string;
  ip: string;
  type: "BLOCK" | "ALLOW";
  note: string | null;
  isActive: boolean;
  expiresAt: string | null;
};

type SecurityEvent = {
  id: string;
  kind: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  ipAddress: string | null;
  userId: string | null;
  message: string;
  createdAt: string;
};

type RateLimitStat = {
  key: string;
  allowed: number;
  blocked: number;
  lastSeenAt: number;
};

export default function AdminSecurityControlPanel({
  rules,
  events,
  rateStats,
}: {
  rules: IpRule[];
  events: SecurityEvent[];
  rateStats: RateLimitStat[];
}) {
  const router = useRouter();
  const [ip, setIp] = useState("");
  const [type, setType] = useState<"BLOCK" | "ALLOW">("BLOCK");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function createRule() {
    setLoading("create");
    setMessage("");
    const res = await fetch("/api/admin/security/ip-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ip, type, note }),
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as { error?: string; message?: string }) : {};
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      setIp("");
      setNote("");
      router.refresh();
    }
  }

  async function toggleRule(rule: IpRule) {
    setLoading(`rule:${rule.id}`);
    setMessage("");
    const res = await fetch("/api/admin/security/ip-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as { error?: string; message?: string }) : {};
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      router.refresh();
    }
  }

  async function updateEventStatus(eventId: string, status: "RESOLVED" | "DISMISSED") {
    setLoading(`event:${eventId}`);
    setMessage("");
    const res = await fetch(`/api/admin/security/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as { error?: string; message?: string }) : {};
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="mb-3 text-sm text-white/60">IP Blacklist / Whitelist</p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="IP address"
          />
          <select
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as "BLOCK" | "ALLOW")}
          >
            <option value="BLOCK">BLOCK</option>
            <option value="ALLOW">ALLOW</option>
          </select>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
          />
          <Button onClick={createRule} disabled={!ip || loading !== null} className="w-full md:w-auto">
            {loading === "create" ? "Saving..." : "Save Rule"}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-white/50">No IP rules configured.</p>
          ) : (
            rules.slice(0, 40).map((rule) => (
              <div key={rule.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="break-all font-medium">
                    {rule.ip} | {rule.type}
                  </p>
                  <p className="text-xs text-white/60">
                    {rule.note || "No note"} | {rule.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => toggleRule(rule)} disabled={loading !== null} className="w-full sm:w-auto">
                  {rule.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="mb-3 text-sm text-white/60">Rate Limit Dashboard (runtime)</p>
        <div className="space-y-2">
          {rateStats.length === 0 ? (
            <p className="text-sm text-white/50">No rate-limit traffic recorded yet.</p>
          ) : (
            rateStats.map((row) => (
              <div key={row.key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <p className="font-medium">{row.key}</p>
                <p className="text-xs text-white/60">
                  allowed={row.allowed} blocked={row.blocked} lastSeen={new Date(row.lastSeenAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="mb-3 text-sm text-white/60">Login & Security Anomaly Alerts</p>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-white/50">No security events yet.</p>
          ) : (
            events.slice(0, 60).map((event) => (
              <div key={event.id} className="space-y-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <p className="font-medium">[{event.severity}] {event.kind}</p>
                <p className="text-xs text-white/70">{event.message}</p>
                <p className="text-xs text-white/50">
                  status={event.status} | ip={event.ipAddress || "unknown"} | user={event.userId || "N/A"} | {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.status === "OPEN" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => updateEventStatus(event.id, "RESOLVED")} disabled={loading !== null} className="w-full sm:w-auto">
                      Resolve
                    </Button>
                    <Button variant="outline" onClick={() => updateEventStatus(event.id, "DISMISSED")} disabled={loading !== null} className="w-full sm:w-auto">
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

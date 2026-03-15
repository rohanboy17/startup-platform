"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useLiveRefresh } from "@/lib/live-refresh";

type SettingsPayload = {
  profile: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    role: string;
    createdAt: string;
    timezone: string;
  };
  withdrawals: {
    defaultUpiId: string | null;
    defaultUpiName: string | null;
    emergencyUsed: number;
    emergencyRemaining: number;
    monthKey: string;
  };
  error?: string;
};

export default function UserSettingsPanel() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [defaultUpiId, setDefaultUpiId] = useState("");
  const [defaultUpiName, setDefaultUpiName] = useState("");
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/settings", { cache: "no-store" });
    const raw = await res.text();
    let parsed: SettingsPayload | { error?: string } = { error: "Unexpected response" };
    try {
      parsed = raw ? (JSON.parse(raw) as SettingsPayload) : parsed;
    } catch {
      parsed = { error: "Unexpected response" };
    }

    if (!res.ok) {
      setError((parsed as { error?: string }).error || "Failed to load settings");
      setLoading(false);
      return;
    }

    setError("");
    const payload = parsed as SettingsPayload;
    setData(payload);
    setLoading(false);

    if (!initialized) {
      setName(payload.profile.name || "");
      setMobile(payload.profile.mobile || "");
      setDefaultUpiId(payload.withdrawals.defaultUpiId || "");
      setDefaultUpiName(payload.withdrawals.defaultUpiName || "");
      setInitialized(true);
    }
  }, [initialized]);

  useLiveRefresh(load, 60000);

  const createdAtValue = data?.profile.createdAt ?? "";
  const createdAtLabel = useMemo(() => {
    if (!createdAtValue) return "";
    return new Date(createdAtValue).toLocaleString();
  }, [createdAtValue]);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/users/me/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        profile: { name, mobile },
        withdrawals: { defaultUpiId, defaultUpiName },
      }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }

    setSaving(false);

    if (!res.ok) {
      setError(parsed.error || "Failed to save settings");
      return;
    }

    setMessage(parsed.message || "Saved");
    await load();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <SectionCard className="border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard className="text-sm text-foreground/70">Loading settings...</SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Profile</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Account details</h3>
            <p className="mt-1 text-sm text-foreground/70">Update your name and mobile number.</p>
          </div>

          <div className="grid gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
            <Input
              placeholder="Mobile (optional)"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="break-all">
              <span className="text-foreground/50">Email:</span> {data?.profile.email}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">Role:</span> {data?.profile.role}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">Created:</span> {createdAtLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save profile"}
            </Button>
            {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Withdrawals</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Default payout details</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Save UPI details to speed up future withdrawal requests.
            </p>
          </div>

          <div className="grid gap-3">
            <Input
              placeholder="Default UPI ID / mobile"
              value={defaultUpiId}
              onChange={(e) => setDefaultUpiId(e.target.value)}
              className="min-h-11"
            />
            <Input
              placeholder="Default UPI name"
              value={defaultUpiName}
              onChange={(e) => setDefaultUpiName(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="font-medium text-foreground">Emergency withdrawals</p>
            <p className="mt-1">
              Used this month: <span className="font-semibold text-foreground">{data?.withdrawals.emergencyUsed ?? 0}</span>
              {" · "}
              Remaining:{" "}
              <span className="font-semibold text-foreground">{data?.withdrawals.emergencyRemaining ?? 0}</span>
            </p>
            <p className="mt-2 text-xs text-foreground/55">Month key: {data?.withdrawals.monthKey}</p>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save withdrawal defaults"}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

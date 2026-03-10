"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  commissionRateDefault: number;
  withdrawalFeeRate: number;
  minWithdrawalAmount: number;
  fundingFeeRate: number;
  levelResetHours: number;
  maintenanceMode: boolean;
};

export default function AdminSystemSettingsPanel({
  initial,
  envChecks,
}: {
  initial: Settings;
  envChecks: { checks: Record<string, boolean>; missing: string[] };
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });

    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(false);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Core Runtime Settings</h3>
        <label className="text-sm text-white/70">Default commission rate (0-0.9)</label>
        <Input
          type="number"
          step="0.01"
          value={settings.commissionRateDefault}
          onChange={(e) => setSettings((s) => ({ ...s, commissionRateDefault: Number(e.target.value) }))}
        />
        <label className="text-sm text-white/70">Min withdrawal amount</label>
        <Input
          type="number"
          value={settings.minWithdrawalAmount}
          onChange={(e) => setSettings((s) => ({ ...s, minWithdrawalAmount: Number(e.target.value) }))}
        />
        <label className="text-sm text-white/70">Withdrawal fee rate (0-0.5)</label>
        <Input
          type="number"
          step="0.01"
          value={settings.withdrawalFeeRate}
          onChange={(e) => setSettings((s) => ({ ...s, withdrawalFeeRate: Number(e.target.value) }))}
        />
        <label className="text-sm text-white/70">Funding fee rate (0-0.5)</label>
        <Input
          type="number"
          step="0.01"
          value={settings.fundingFeeRate}
          onChange={(e) => setSettings((s) => ({ ...s, fundingFeeRate: Number(e.target.value) }))}
        />
        <label className="text-sm text-white/70">Daily reset hours</label>
        <Input
          type="number"
          value={settings.levelResetHours}
          onChange={(e) => setSettings((s) => ({ ...s, levelResetHours: Number(e.target.value) }))}
        />

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
          />
          Maintenance mode
        </label>

        <Button onClick={save} disabled={loading} className="w-full sm:w-auto">{loading ? "Saving..." : "Save Settings"}</Button>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Environment Checks</h3>
        {Object.entries(envChecks.checks).map(([key, ok]) => (
          <div key={key} className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all">{key}</span>
            <span className={ok ? "text-emerald-300" : "text-rose-300"}>{ok ? "SET" : "MISSING"}</span>
          </div>
        ))}
        {envChecks.missing.length ? (
          <p className="text-xs text-rose-300">Missing: {envChecks.missing.join(", ")}</p>
        ) : (
          <p className="text-xs text-emerald-300">All required environment keys are configured.</p>
        )}
      </div>

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

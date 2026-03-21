"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("user.settingsPanel");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [defaultUpiId, setDefaultUpiId] = useState("");
  const [defaultUpiName, setDefaultUpiName] = useState("");
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async () => {
    const settingsRes = await fetch("/api/v2/users/me/settings", { cache: "no-store" });

    const raw = await settingsRes.text();
    let parsed: SettingsPayload | { error?: string } = { error: t("errors.unexpectedResponse") };
    try {
      parsed = raw ? (JSON.parse(raw) as SettingsPayload) : parsed;
    } catch {
      parsed = { error: t("errors.unexpectedResponse") };
    }

    if (!settingsRes.ok) {
      setError((parsed as { error?: string }).error || t("errors.failedToLoad"));
      setLoading(false);
      return;
    }

    setError("");
    const payload = parsed as SettingsPayload;
    setData(payload);
    setLoading(false);

    if (!initialized) {
      setDefaultUpiId(payload.withdrawals.defaultUpiId || "");
      setDefaultUpiName(payload.withdrawals.defaultUpiName || "");
      setInitialized(true);
    }
  }, [initialized, t]);

  useLiveRefresh(load, 60000);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/users/me/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        withdrawals: { defaultUpiId, defaultUpiName },
      }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: t("errors.unexpectedServerResponse") };
    }

    setSaving(false);

    if (!res.ok) {
      setError(parsed.error || t("errors.failedToSave"));
      return;
    }

    setMessage(parsed.message || t("messages.saved"));
    await load();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <SectionCard className="border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </SectionCard>
      ) : null}

      {message ? (
        <SectionCard className="border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-700 dark:text-emerald-200">
          {message}
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard className="text-sm text-foreground/70">{t("loading")}</SectionCard>
      ) : null}

      <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("eyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("title")}</h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("description")}
            </p>
          </div>

          <div className="grid gap-3">
            <Input
              placeholder={t("upiIdPlaceholder")}
              value={defaultUpiId}
              onChange={(e) => setDefaultUpiId(e.target.value)}
              className="min-h-11"
            />
            <Input
              placeholder={t("upiNamePlaceholder")}
              value={defaultUpiName}
              onChange={(e) => setDefaultUpiName(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="font-medium text-foreground">{t("emergency.title")}</p>
            <p className="mt-1">
              {t("emergency.used", { count: data?.withdrawals.emergencyUsed ?? 0 })}{" "}
              <span className="font-semibold text-foreground">{data?.withdrawals.emergencyUsed ?? 0}</span>
              {" - "}
              {t("emergency.remaining", { count: data?.withdrawals.emergencyRemaining ?? 0 })}{" "}
              <span className="font-semibold text-foreground">{data?.withdrawals.emergencyRemaining ?? 0}</span>
            </p>
            <p className="mt-2 text-xs text-foreground/55">{t("emergency.monthKey", { value: data?.withdrawals.monthKey ?? "" })}</p>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? t("actions.saving") : t("actions.save")}
          </Button>
      </SectionCard>
    </div>
  );
}

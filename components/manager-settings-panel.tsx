"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  manager: {
    queueSort: "NEWEST" | "OLDEST";
    riskOnly: boolean;
    autoNext: boolean;
    proofMode: "COMPACT" | "EXPANDED";
  } | null;
  error?: string;
};

const timezoneOptions = [
  "Asia/Calcutta",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export default function ManagerSettingsPanel() {
  const t = useTranslations("manager.settings");
  const locale = useLocale();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Calcutta");
  const [queueSort, setQueueSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [riskOnly, setRiskOnly] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [proofMode, setProofMode] = useState<"COMPACT" | "EXPANDED">("COMPACT");
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/settings", { cache: "no-store" });
    const raw = await res.text();
    let parsed: SettingsPayload | { error?: string } = { error: t("errors.unexpectedResponse") };
    try {
      parsed = raw ? (JSON.parse(raw) as SettingsPayload) : parsed;
    } catch {
      parsed = { error: t("errors.unexpectedResponse") };
    }

    if (!res.ok) {
      setError((parsed as { error?: string }).error || t("errors.failedToLoad"));
      setLoading(false);
      return;
    }

    setError("");
    const payload = parsed as SettingsPayload;
    setData(payload);
    setLoading(false);

    if (!initialized) {
      setDisplayName(payload.profile.name || "");
      setTimezone(payload.profile.timezone || "Asia/Calcutta");
      if (payload.manager) {
        setQueueSort(payload.manager.queueSort);
        setRiskOnly(payload.manager.riskOnly);
        setAutoNext(payload.manager.autoNext);
        setProofMode(payload.manager.proofMode);
      }
      setInitialized(true);
    }
  }, [initialized, t]);

  useLiveRefresh(load, 60000);

  const createdAtValue = data?.profile.createdAt ?? "";
  const createdAtLabel = useMemo(() => {
    if (!createdAtValue) return "";
    return new Date(createdAtValue).toLocaleString(locale);
  }, [createdAtValue, locale]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/users/me/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        profile: { name: displayName, timezone },
        manager: { queueSort, riskOnly, autoNext, proofMode, timezone },
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

    setMessage(parsed.message || t("saved"));
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
        <SectionCard className="text-sm text-foreground/70">{t("loading")}</SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("profileEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("profileTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">{t("profileSubtitle")}</p>
          </div>

          <div className="grid gap-3">
            <Input
              placeholder={t("displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="min-h-11"
            />

            <div className="grid gap-2">
              <label className="text-sm text-foreground/70">{t("timezone")}</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-400/50"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="break-all">
              <span className="text-foreground/50">{t("email")}:</span> {data?.profile.email}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">{t("role")}:</span> {data?.profile.role}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">{t("created")}:</span> {createdAtLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
              {saving ? t("saving") : t("saveProfile")}
            </Button>
            {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("moderationEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("moderationTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">{t("moderationSubtitle")}</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-foreground/70">{t("defaultSort")}</label>
              <select
                value={queueSort}
                onChange={(e) => setQueueSort(e.target.value === "OLDEST" ? "OLDEST" : "NEWEST")}
                className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-400/50"
              >
                <option value="NEWEST">{t("sortOptions.NEWEST")}</option>
                <option value="OLDEST">{t("sortOptions.OLDEST")}</option>
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
              <input
                type="checkbox"
                checked={riskOnly}
                onChange={(e) => setRiskOnly(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-400"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">{t("riskFirstTitle")}</span>
                <span className="block text-sm text-foreground/70">{t("riskFirstBody")}</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-400"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">{t("autoNextTitle")}</span>
                <span className="block text-sm text-foreground/70">{t("autoNextBody")}</span>
              </span>
            </label>

            <div className="grid gap-2">
              <label className="text-sm text-foreground/70">{t("proofPreviewMode")}</label>
              <select
                value={proofMode}
                onChange={(e) => setProofMode(e.target.value === "EXPANDED" ? "EXPANDED" : "COMPACT")}
                className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-400/50"
              >
                <option value="COMPACT">{t("proofModeOptions.COMPACT")}</option>
                <option value="EXPANDED">{t("proofModeOptions.EXPANDED")}</option>
              </select>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            {saving ? t("saving") : t("savePreferences")}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

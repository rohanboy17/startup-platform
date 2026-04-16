"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toDateLocale } from "@/lib/date-locale";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

type BusinessSettings = {
  profileImageUrl: string;
  brandName: string;
  companyName: string;
  contactEmail: string;
  supportContact: string;
  defaultPayoutUpiId: string;
  defaultPayoutUpiName: string;
  billingDetails: string;
  refundPreference: string;
  notificationPreferences: {
    campaignStatus: boolean;
    budgetAlerts: boolean;
    paymentAlerts: boolean;
    rejectionSpike: boolean;
  };
};

type ResponseShape = {
  profile: {
    name: string;
    email: string;
    kycStatus: string;
    createdAt: string;
  };
  settings: BusinessSettings;
  error?: string;
};

export default function BusinessSettingsPanel() {
  const t = useTranslations("business.settingsPanel");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [data, setData] = useState<ResponseShape | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hydrated = useHydrated();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/settings", { credentials: "include" });
    const raw = await res.text();
    let parsed: ResponseShape | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as ResponseShape) : null;
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok || !parsed) {
      setError(parsed?.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    if (!data || (!isDirty && !saving)) {
      setData(parsed);
    }
  }, [data, isDirty, saving, t]);

  useLiveRefresh(load, 15000);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: data.profile.name,
        settings: data.settings,
      }),
    });

    const raw = await res.text();
    const payload = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setSaving(false);

    if (!res.ok) {
      setError(payload.error || t("errors.failedToSave"));
      return;
    }

    setMessage(payload.message || t("messages.updated"));
    setIsDirty(false);
    void load();
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const payload = (await res.json().catch(() => null)) as { error?: string; url?: string } | null;
    setUploadingAvatar(false);

    if (!res.ok || !payload?.url) {
      setError(payload?.error || t("errors.failedToUploadAvatar"));
      return;
    }

    updateSettings("profileImageUrl", payload.url);
    setMessage(t("messages.avatarUpdated"));
  }

  function updateProfile<K extends keyof ResponseShape["profile"]>(key: K, value: ResponseShape["profile"][K]) {
    setIsDirty(true);
    setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, [key]: value } } : prev));
  }

  function updateSettings<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setIsDirty(true);
    setData((prev) => (prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev));
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("profile.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("profile.title")}</h3>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="size-16 border border-foreground/10">
                  {data.settings.profileImageUrl ? <AvatarImage src={data.settings.profileImageUrl} alt={data.settings.brandName || data.profile.name} /> : null}
                  <AvatarFallback className="bg-foreground/[0.08] text-base font-semibold text-foreground">
                    {(data.settings.brandName || data.profile.name || "B").trim().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("profile.photoTitle")}</p>
                  <p className="mt-1 text-xs text-foreground/65">{t("profile.photoSubtitle")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) {
                      void uploadAvatar(next);
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? <Upload size={16} /> : <Camera size={16} />}
                  {uploadingAvatar ? t("profile.uploadingAvatar") : t("profile.uploadAvatar")}
                </Button>
                {data.settings.profileImageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => updateSettings("profileImageUrl", "")}
                  >
                    <X size={16} />
                    {t("profile.removeAvatar")}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("profile.displayName")}</label>
              <Input
                value={data.profile.name}
                onChange={(e) => updateProfile("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("profile.brandName")}</label>
              <Input
                value={data.settings.brandName}
                onChange={(e) => updateSettings("brandName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("profile.companyName")}</label>
              <Input
                value={data.settings.companyName}
                onChange={(e) => updateSettings("companyName", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("profile.contactEmail")}</label>
                <Input
                  value={data.settings.contactEmail}
                  onChange={(e) => updateSettings("contactEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("profile.supportContact")}</label>
                <Input
                  value={data.settings.supportContact}
                  onChange={(e) => updateSettings("supportContact", e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/60">
              <p className="break-all">{t("profile.accountEmail", { email: data.profile.email })}</p>
              <p>{t("profile.kycStatus", { status: data.profile.kycStatus })}</p>
              <p suppressHydrationWarning>
                {t("profile.joined")}{" "}
                {hydrated ? new Date(data.profile.createdAt).toLocaleDateString(dateLocale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }) : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("billing.eyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("billing.title")}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("billing.defaultPayoutUpiId")}</label>
              <Input
                value={data.settings.defaultPayoutUpiId}
                onChange={(e) => updateSettings("defaultPayoutUpiId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("billing.defaultPayoutUpiName")}</label>
              <Input
                value={data.settings.defaultPayoutUpiName}
                onChange={(e) => updateSettings("defaultPayoutUpiName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("billing.billingDetails")}</label>
              <textarea
                value={data.settings.billingDetails}
                onChange={(e) => updateSettings("billingDetails", e.target.value)}
                className="min-h-28 w-full rounded-xl border border-foreground/20 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/50 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("billing.refundPreference")}</label>
              <textarea
                value={data.settings.refundPreference}
                onChange={(e) => updateSettings("refundPreference", e.target.value)}
                className="min-h-28 w-full rounded-xl border border-foreground/20 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/50 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">{t("notifications.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("notifications.title")}</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["campaignStatus", t("notifications.campaignStatus")],
              ["budgetAlerts", t("notifications.budgetAlerts")],
              ["paymentAlerts", t("notifications.paymentAlerts")],
              ["rejectionSpike", t("notifications.rejectionSpike")],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={data.settings.notificationPreferences[key as keyof BusinessSettings["notificationPreferences"]]}
                  onChange={(e) =>
                    updateSettings("notificationPreferences", {
                      ...data.settings.notificationPreferences,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? t("actions.saving") : t("actions.save")}
            </Button>
            {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

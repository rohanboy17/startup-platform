"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLiveRefresh } from "@/lib/live-refresh";

type KycRequest = {
  id: string;
  legalName: string;
  contactName: string;
  phone: string;
  address: string;
  website: string | null;
  taxId: string | null;
  documentUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type ResponseShape = {
  profile: { name: string; email: string; kycStatus: string };
  request: KycRequest | null;
  error?: string;
};

const EMPTY_FORM = {
  legalName: "",
  contactName: "",
  phone: "",
  address: "",
  website: "",
  taxId: "",
  documentUrl: "",
};

export default function BusinessKycPanel() {
  const t = useTranslations("business.kycPanel");
  const [data, setData] = useState<ResponseShape | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/kyc", { credentials: "include" });
    const raw = await res.text();
    let parsed: ResponseShape | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as ResponseShape) : null;
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok || !parsed) {
      setError(parsed?.error || t("errors.failedToLoadStatus"));
      return;
    }
    setError("");
    setData(parsed);
    // Keep in-progress user input during auto-refresh polling.
    if (!parsed.request && !isDirty && !saving) {
      setForm(EMPTY_FORM);
    }
  }, [isDirty, saving, t]);

  useLiveRefresh(load, 15000);

  const hasPending = data?.request?.status === "PENDING";
  const isVerified = data?.profile.kycStatus === "VERIFIED";

  const statusLabel = useMemo(() => {
    if (isVerified) return t("status.verified");
    if (data?.profile.kycStatus === "REJECTED") return t("status.rejected");
    return t("status.pending");
  }, [data, isVerified, t]);

  async function submit() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    const raw = await res.text();
    const payload = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setSaving(false);

    if (!res.ok) {
      setError(payload.error || t("errors.failedToSubmit"));
      return;
    }

    setMessage(payload.message || t("messages.submitted"));
    setIsDirty(false);
    void load();
  }

  function updateFormField<Key extends keyof typeof EMPTY_FORM>(key: Key, value: string) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-foreground/60">{t("statusCard.eyebrow")}</p>
              <p className="text-2xl font-semibold text-foreground">{statusLabel}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 px-4 py-2 text-sm text-foreground/70">
              {t("accountLabel")}: {data.profile.email}
            </div>
          </div>
          {data.request?.notes ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{t("reviewerNotes", { notes: data.request.notes })}</p>
          ) : null}
        </CardContent>
      </Card>

      {hasPending ? (
        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6 text-sm text-foreground/70">
            <p>{t("pending.bodyLine1")}</p>
            <p>{t("pending.bodyLine2")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("form.eyebrow")}</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">{t("form.title")}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.legalName")}</label>
                <Input value={form.legalName} onChange={(e) => updateFormField("legalName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.contactName")}</label>
                <Input value={form.contactName} onChange={(e) => updateFormField("contactName", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.phone")}</label>
                <Input value={form.phone} onChange={(e) => updateFormField("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.websiteOptional")}</label>
                <Input value={form.website} onChange={(e) => updateFormField("website", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground/70">{t("form.address")}</label>
              <textarea
                value={form.address}
                onChange={(e) => updateFormField("address", e.target.value)}
                className="min-h-24 w-full rounded-xl border border-foreground/20 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/50 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.taxIdOptional")}</label>
                <Input value={form.taxId} onChange={(e) => updateFormField("taxId", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">{t("form.documentUrlOptional")}</label>
                <Input
                  value={form.documentUrl}
                  onChange={(e) => updateFormField("documentUrl", e.target.value)}
                />
              </div>
            </div>

            <Button onClick={() => void submit()} disabled={saving || isVerified} className="w-full sm:w-auto">
              {saving ? t("form.submitting") : t("form.requestReview")}
            </Button>
            {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  createdAt: string;
  notes: string | null;
  business: {
    id: string;
    name: string | null;
    email: string;
    kycStatus: string;
    createdAt: string;
  };
};

type ResponseShape = {
  requests?: KycRequest[];
  error?: string;
};

export default function AdminKycRequestsPanel() {
  const t = useTranslations("admin.kycRequestsPanel");
  const [data, setData] = useState<KycRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kyc", { credentials: "include" });
    const raw = await res.text();
    let parsed: ResponseShape = {};
    try {
      parsed = raw ? (JSON.parse(raw) as ResponseShape) : {};
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
    } else {
      setError("");
      setData(parsed.requests || []);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 12000);

  async function updateStatus(requestId: string, status: "VERIFIED" | "REJECTED") {
    setSavingId(requestId);
    const res = await fetch(`/api/admin/kyc/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, notes: notes[requestId] }),
    });

    const raw = await res.text();
    const payload = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setSavingId(null);

    if (!res.ok) {
      setError(payload.error || t("errors.failedToUpdate"));
      return;
    }

    setNotes((prev) => ({ ...prev, [requestId]: "" }));
    void load();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <Card className="rounded-2xl border-foreground/10 bg-background/60">
          <CardContent className="p-6 text-sm text-foreground/60">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.map((request) => (
            <Card key={request.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-3 p-6">
                <div>
                  <h3 className="text-lg font-semibold">{request.legalName}</h3>
                  <p className="text-sm text-foreground/70">
                    {t("businessLine", { name: request.business.name || t("unnamedBusiness"), email: request.business.email })}
                  </p>
                  <p className="text-xs text-foreground/50">{t("submittedAt", { value: new Date(request.createdAt).toLocaleString() })}</p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4 text-sm text-foreground/70">
                  <p>{t("fields.contact", { value: request.contactName })}</p>
                  <p>{t("fields.phone", { value: request.phone })}</p>
                  <p>{t("fields.address", { value: request.address })}</p>
                  <p>{t("fields.website", { value: request.website || t("notProvided") })}</p>
                  <p>{t("fields.taxId", { value: request.taxId || t("notProvided") })}</p>
                  <p>{t("fields.documentUrl", { value: request.documentUrl || t("notProvided") })}</p>
                </div>

                <textarea
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                  className="w-full rounded-xl border border-foreground/10 bg-background/60 px-4 py-3 text-sm text-foreground outline-none"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => void updateStatus(request.id, "VERIFIED")}
                    disabled={savingId === request.id}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {savingId === request.id ? t("saving") : t("verify")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void updateStatus(request.id, "REJECTED")}
                    disabled={savingId === request.id}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {savingId === request.id ? t("saving") : t("reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

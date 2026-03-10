"use client";

import { useCallback, useMemo, useState } from "react";
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
  const [data, setData] = useState<ResponseShape | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setError("Unexpected server response");
      return;
    }
    if (!res.ok || !parsed) {
      setError(parsed?.error || "Failed to load KYC status");
      return;
    }
    setError("");
    setData(parsed);
    if (!parsed.request) {
      setForm(EMPTY_FORM);
    }
  }, []);

  useLiveRefresh(load, 15000);

  const hasPending = data?.request?.status === "PENDING";
  const isVerified = data?.profile.kycStatus === "VERIFIED";

  const statusLabel = useMemo(() => {
    if (isVerified) return "Verified";
    if (data?.profile.kycStatus === "REJECTED") return "Rejected";
    return "Pending";
  }, [data, isVerified]);

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
      setError(payload.error || "Failed to submit KYC request");
      return;
    }

    setMessage(payload.message || "KYC request submitted");
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading KYC...</p>;

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/60">KYC status</p>
              <p className="text-2xl font-semibold text-white">{statusLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
              Account: {data.profile.email}
            </div>
          </div>
          {data.request?.notes ? (
            <p className="text-sm text-amber-100/80">Reviewer notes: {data.request.notes}</p>
          ) : null}
        </CardContent>
      </Card>

      {hasPending ? (
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-3 p-4 sm:p-6 text-sm text-white/70">
            <p>Your KYC request is currently under review.</p>
            <p>We will notify you once it is approved or rejected.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Submit KYC details</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Business verification form</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Legal business name</label>
                <Input value={form.legalName} onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Contact person name</label>
                <Input value={form.contactName} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Phone number</label>
                <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Website (optional)</label>
                <Input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Business address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Tax ID (optional)</label>
                <Input value={form.taxId} onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Document URL (optional)</label>
                <Input
                  value={form.documentUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, documentUrl: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={() => void submit()} disabled={saving || isVerified} className="w-full sm:w-auto">
              {saving ? "Submitting..." : "Request KYC Review"}
            </Button>
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

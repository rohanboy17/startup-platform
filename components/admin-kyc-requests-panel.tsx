"use client";

import { useCallback, useState } from "react";
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
      setError("Unexpected server response");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load KYC requests");
    } else {
      setError("");
      setData(parsed.requests || []);
    }
    setLoading(false);
  }, []);

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
      setError(payload.error || "Failed to update KYC status");
      return;
    }

    setNotes((prev) => ({ ...prev, [requestId]: "" }));
    void load();
  }

  if (loading) return <p className="text-sm text-white/60">Loading KYC requests...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">No pending KYC requests.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.map((request) => (
            <Card key={request.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-3 p-6">
                <div>
                  <h3 className="text-lg font-semibold">{request.legalName}</h3>
                  <p className="text-sm text-white/70">
                    Business: {request.business.name || "Unnamed business"} | {request.business.email}
                  </p>
                  <p className="text-xs text-white/50">Submitted {new Date(request.createdAt).toLocaleString()}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  <p>Contact: {request.contactName}</p>
                  <p>Phone: {request.phone}</p>
                  <p>Address: {request.address}</p>
                  <p>Website: {request.website || "Not provided"}</p>
                  <p>Tax ID: {request.taxId || "Not provided"}</p>
                  <p>Document URL: {request.documentUrl || "Not provided"}</p>
                </div>

                <textarea
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                  placeholder="Admin notes (optional)"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => void updateStatus(request.id, "VERIFIED")}
                    disabled={savingId === request.id}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {savingId === request.id ? "Saving..." : "Verify"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void updateStatus(request.id, "REJECTED")}
                    disabled={savingId === request.id}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {savingId === request.id ? "Saving..." : "Reject"}
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


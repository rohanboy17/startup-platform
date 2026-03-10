"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLiveRefresh } from "@/lib/live-refresh";

type BusinessSettings = {
  brandName: string;
  companyName: string;
  contactEmail: string;
  supportContact: string;
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
  const [data, setData] = useState<ResponseShape | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/settings", { credentials: "include" });
    const raw = await res.text();
    let parsed: ResponseShape | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as ResponseShape) : null;
    } catch {
      setError("Unexpected server response");
      return;
    }
    if (!res.ok || !parsed) {
      setError(parsed?.error || "Failed to load settings");
      return;
    }
    setError("");
    setData(parsed);
  }, []);

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
      setError(payload.error || "Failed to save settings");
      return;
    }

    setMessage(payload.message || "Settings updated");
    void load();
  }

  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">Loading business settings...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Business profile</p>
              <h3 className="text-xl font-semibold text-white">Brand and contact identity</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Display name</label>
              <Input
                value={data.profile.name}
                onChange={(e) => setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, name: e.target.value } } : prev))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Brand name</label>
              <Input
                value={data.settings.brandName}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, settings: { ...prev.settings, brandName: e.target.value } } : prev
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Company name</label>
              <Input
                value={data.settings.companyName}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, settings: { ...prev.settings, companyName: e.target.value } } : prev
                  )
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Contact email</label>
                <Input
                  value={data.settings.contactEmail}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, settings: { ...prev.settings, contactEmail: e.target.value } } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Support contact</label>
                <Input
                  value={data.settings.supportContact}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, settings: { ...prev.settings, supportContact: e.target.value } } : prev
                    )
                  }
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              <p className="break-all">Account email: {data.profile.email}</p>
              <p>KYC status: {data.profile.kycStatus}</p>
              <p>
                Joined:{" "}
                {new Date(data.profile.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm text-white/60">Billing and policies</p>
              <h3 className="text-xl font-semibold text-white">Refund and billing preferences</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Billing details</label>
              <textarea
                value={data.settings.billingDetails}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, settings: { ...prev.settings, billingDetails: e.target.value } } : prev
                  )
                }
                className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Refund preference</label>
              <textarea
                value={data.settings.refundPreference}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, settings: { ...prev.settings, refundPreference: e.target.value } } : prev
                  )
                }
                className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-sm text-white/60">Notification preferences</p>
            <h3 className="text-xl font-semibold text-white">Choose which business alerts matter</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["campaignStatus", "Campaign approved/rejected/completed"],
              ["budgetAlerts", "Wallet low and budget exhausted alerts"],
              ["paymentAlerts", "Payment and funding status alerts"],
              ["rejectionSpike", "Unusual rejection spike alerts"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={data.settings.notificationPreferences[key as keyof BusinessSettings["notificationPreferences"]]}
                  onChange={(e) =>
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            settings: {
                              ...prev.settings,
                              notificationPreferences: {
                                ...prev.settings.notificationPreferences,
                                [key]: e.target.checked,
                              },
                            },
                          }
                        : prev
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

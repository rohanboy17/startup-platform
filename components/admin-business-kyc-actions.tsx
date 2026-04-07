"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export default function AdminBusinessKycActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: KycStatus;
}) {
  const t = useTranslations("admin.businessKycActions");
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState<KycStatus>(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveKyc() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/kyc`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kycStatus, notes }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    setMessage(data.message || data.error || t("updated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={kycStatus}
          onChange={(e) => setKycStatus(e.target.value as KycStatus)}
          className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          disabled={loading}
        >
          <option value="PENDING">{t("status.pending")}</option>
          <option value="VERIFIED">{t("status.verified")}</option>
          <option value="REJECTED">{t("status.rejected")}</option>
        </select>
        <Button onClick={saveKyc} disabled={loading}>
          {loading ? t("saving") : t("update")}
        </Button>
      </div>
      <Input
        placeholder={t("notesPlaceholder")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

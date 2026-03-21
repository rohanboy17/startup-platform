"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function PlatformPayoutActions({
  payoutId,
  status,
}: {
  payoutId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const t = useTranslations("admin.platformPayoutActions");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | "RETRY" | null>(null);
  const [message, setMessage] = useState("");

  async function update(action: "APPROVED" | "REJECTED" | "RETRY") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/revenue/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, note }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || t("actionFailed"));
      return;
    }

    setMessage(data.message || t("updated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
        placeholder={t("notePlaceholder")}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        {status === "PENDING" ? (
          <>
            <Button onClick={() => update("APPROVED")} disabled={loading !== null} className="w-full sm:w-auto">
              {loading === "APPROVED" ? t("approving") : t("approve")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => update("REJECTED")}
              disabled={loading !== null}
              className="w-full sm:w-auto"
            >
              {loading === "REJECTED" ? t("rejecting") : t("reject")}
            </Button>
          </>
        ) : null}
        {status === "REJECTED" ? (
          <Button variant="outline" onClick={() => update("RETRY")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "RETRY" ? t("retrying") : t("retry")}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

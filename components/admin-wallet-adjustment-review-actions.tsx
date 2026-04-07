"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminWalletAdjustmentReviewActions({
  requestId,
}: {
  requestId: string;
}) {
  const t = useTranslations("admin.walletAdjustmentReviewActions");
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/finance/adjustments/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reviewNote }),
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
    setReviewNote("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <input
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
        placeholder={t("notePlaceholder")}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => run("APPROVE")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "APPROVE" ? t("approving") : t("approve")}
        </Button>
        <Button variant="destructive" onClick={() => run("REJECT")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "REJECT" ? t("rejecting") : t("reject")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

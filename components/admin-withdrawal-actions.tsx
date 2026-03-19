"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminWithdrawalActions({
  withdrawalId,
}: {
  withdrawalId: string;
}) {
  const t = useTranslations("admin.withdrawalActions");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [message, setMessage] = useState("");

  async function review(action: "APPROVED" | "REJECTED") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
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
      data = { error: t("errors.unexpected") };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || t("errors.actionFailed"));
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
        className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        placeholder={t("notePlaceholder")}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => review("APPROVED")} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "APPROVED" ? t("approving") : t("approve")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => review("REJECTED")}
          disabled={loading !== null}
          className="w-full sm:w-auto"
        >
          {loading === "REJECTED" ? t("rejecting") : t("reject")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

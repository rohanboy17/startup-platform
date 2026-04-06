"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminJobApplicationActions({
  applicationId,
}: {
  applicationId: string;
}) {
  const t = useTranslations("admin.jobsPage.applicationActions");
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function review(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/admin/job-applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("unexpected") };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(parsed.error || t("actionFailed"));
      return;
    }

    setReason("");
    setMessage(parsed.message || t("saved"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("reasonPlaceholder")}
        rows={3}
        className="w-full resize-none rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/45"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => void review("APPROVE")} disabled={loading !== null} className="min-h-11 w-full sm:w-auto">
          {loading === "APPROVE" ? t("approving") : t("approve")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => void review("REJECT")}
          disabled={loading !== null}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading === "REJECT" ? t("rejecting") : t("reject")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

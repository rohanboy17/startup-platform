"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminCampaignEscalationButton({
  campaignId,
  mode,
}: {
  campaignId: string;
  mode: "ESCALATE" | "CLEAR_ESCALATION";
}) {
  const t = useTranslations("admin.campaignEscalationButton");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: mode,
        reason: mode === "ESCALATE" ? t("riskCenterReason") : undefined,
      }),
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
    <div className="space-y-1">
      <Button type="button" variant="outline" onClick={run} disabled={loading}>
        {loading
          ? mode === "ESCALATE"
            ? t("loading.escalating")
            : t("loading.clearing")
          : mode === "ESCALATE"
            ? t("actions.escalate")
            : t("actions.clearEscalation")}
      </Button>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

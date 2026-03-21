"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminCampaignEscalationControls() {
  const t = useTranslations("admin.campaignEscalationControls");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function escalateBreached() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/v2/admin/campaigns/escalate", {
      method: "PATCH",
      credentials: "include",
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || t("failed"));
      return;
    }

    setMessage(data.message || t("completed"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={escalateBreached} disabled={loading} variant="outline">
          {loading ? t("escalating") : t("button")}
        </Button>
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

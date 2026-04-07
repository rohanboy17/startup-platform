"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type BulkRiskAction = "DISMISS_ALL_FLAGS" | "RESOLVE_ALL_ESCALATIONS";

export default function AdminRiskBulkActions() {
  const t = useTranslations("admin.riskBulkActions");
  const router = useRouter();
  const [loading, setLoading] = useState<BulkRiskAction | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: BulkRiskAction) {
    setLoading(action);
    setMessage("");

    const res = await fetch("/api/admin/risk/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(null);
    setMessage(data.message || data.error || t("updated"));

    if (res.ok) {
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => void run("DISMISS_ALL_FLAGS")}
          disabled={loading !== null}
          className="w-full sm:w-auto"
        >
          {loading === "DISMISS_ALL_FLAGS" ? t("dismissing") : t("dismissAll")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void run("RESOLVE_ALL_ESCALATIONS")}
          disabled={loading !== null}
          className="w-full sm:w-auto"
        >
          {loading === "RESOLVE_ALL_ESCALATIONS" ? t("resolving") : t("resolveAll")}
        </Button>
      </div>
      {message ? <p className="text-xs text-amber-800 dark:text-amber-200 dark:text-foreground/60">{message}</p> : null}
    </div>
  );
}

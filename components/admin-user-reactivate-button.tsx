"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminUserReactivateButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.userReactivateButton");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function reactivate() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "ACTIVE", reason: t("reason") }),
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
      <Button type="button" variant="outline" onClick={reactivate} disabled={loading}>
        {loading ? t("reactivating") : t("reactivate")}
      </Button>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

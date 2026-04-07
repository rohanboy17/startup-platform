"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminUserFlagActions({
  userId,
  isSuspicious,
}: {
  userId: string;
  isSuspicious: boolean;
}) {
  const t = useTranslations("admin.userFlagActions");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: "FLAG" | "UNFLAG") {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/flag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        reason,
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
    <div className="space-y-2">
      {!isSuspicious ? (
        <Input
          placeholder={t("reasonPlaceholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      ) : null}
      <div className="flex gap-2">
        {!isSuspicious ? (
          <Button onClick={() => run("FLAG")} disabled={loading}>
            {loading ? t("flagging") : t("flagUser")}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => run("UNFLAG")} disabled={loading}>
            {loading ? t("updating") : t("unflagUser")}
          </Button>
        )}
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

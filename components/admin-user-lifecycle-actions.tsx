"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export default function AdminUserLifecycleActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: AccountStatus;
}) {
  const t = useTranslations("admin.userLifecycleActions");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const softDeleted = currentStatus === "BANNED";

  async function run(action: "SOFT_DELETE" | "REACTIVATE") {
    if (action === "SOFT_DELETE" && !reason.trim()) {
      setMessage(t("reasonRequired"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        reason: reason.trim() || undefined,
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
      <Input
        placeholder={t("reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          onClick={() => run("SOFT_DELETE")}
          disabled={loading || softDeleted}
        >
          {loading ? t("processing") : t("softDelete")}
        </Button>
        <Button
          variant="outline"
          onClick={() => run("REACTIVATE")}
          disabled={loading || !softDeleted}
        >
          {loading ? t("processing") : t("reactivate")}
        </Button>
      </div>
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

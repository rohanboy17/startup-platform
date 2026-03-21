"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export default function AdminUserStatusActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: AccountStatus;
}) {
  const t = useTranslations("admin.userStatusActions");
  const router = useRouter();
  const [status, setStatus] = useState<AccountStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveStatus() {
    if (status === currentStatus) {
      setMessage(t("noStatusChange"));
      return;
    }
    if ((status === "SUSPENDED" || status === "BANNED") && !reason.trim()) {
      setMessage(t("reasonRequired"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, reason }),
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountStatus)}
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white sm:w-auto"
          disabled={loading}
        >
          <option value="ACTIVE">{t("status.active")}</option>
          <option value="SUSPENDED">{t("status.suspended")}</option>
          <option value="BANNED">{t("status.banned")}</option>
        </select>
        <Button onClick={saveStatus} disabled={loading} className="w-full sm:w-auto">
          {loading ? t("saving") : t("updateStatus")}
        </Button>
      </div>
      <Input
        placeholder={t("reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}

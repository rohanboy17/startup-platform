"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminReferralCodeToggle({
  userId,
  code,
  isActive,
}: {
  userId: string;
  code: string;
  isActive: boolean;
}) {
  const t = useTranslations("admin.referralCodeToggle");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleCode() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/referrals/${userId}/code`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !isActive }),
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

    if (res.ok) {
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
          {code}
        </span>
        <Button
          type="button"
          variant={isActive ? "destructive" : "secondary"}
          size="sm"
          onClick={toggleCode}
          disabled={loading}
        >
          {loading ? t("saving") : isActive ? t("disableCode") : t("enableCode")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

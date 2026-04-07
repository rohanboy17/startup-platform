"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminTwoFactorToggleCard({
  enabled,
  enabledAt,
}: {
  enabled: boolean;
  enabledAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle(next: boolean) {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/security/2fa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: next }),
    });

    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(false);
    setMessage(data.message || data.error || "Updated");

    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
      <p className="text-sm text-foreground/60">Admin 2FA</p>
      <p className="mt-1 text-sm text-foreground/80">
        Status: <span className={enabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>{enabled ? "Enabled" : "Disabled"}</span>
      </p>
      <p className="mt-1 text-xs text-foreground/55">
        {enabledAt ? `Enabled at: ${new Date(enabledAt).toLocaleString()}` : "Not enabled yet"}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => toggle(true)} disabled={loading || enabled} className="w-full sm:w-auto">
          Enable
        </Button>
        <Button variant="outline" onClick={() => toggle(false)} disabled={loading || !enabled} className="w-full sm:w-auto">
          Disable
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-foreground/70">{message}</p> : null}
    </div>
  );
}

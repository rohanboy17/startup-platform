"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type BulkItem = {
  id: string;
  label: string;
  fraudScore: number;
};

export default function AdminV2SubmissionBulkActions({ items }: { items: BulkItem[] }) {
  const t = useTranslations("admin.v2SubmissionBulkActions");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function submit() {
    if (selected.length === 0) {
      setMessage(t("selectFirst"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/v2/admin/submissions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        submissionIds: selected,
        action,
        reason: reason.trim() || undefined,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string; updated?: number; failed?: number } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || t("bulkUpdateFailed"));
      return;
    }

    setMessage(t("doneMessage", { message: data.message || t("done"), updated: data.updated || 0, failed: data.failed || 0 }));
    setSelected([]);
    setReason("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/70">{t("title")}</p>
        <span className="text-xs text-foreground/60">{t("selected", { count: selected.length })}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setSelected(items.map((i) => i.id))} disabled={loading}>
          {t("selectAll")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setSelected([])} disabled={loading}>
          {t("clear")}
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as "APPROVE" | "REJECT")}
          className="rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          disabled={loading}
        >
          <option value="APPROVE">{t("actions.approve")}</option>
          <option value="REJECT">{t("actions.reject")}</option>
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 md:col-span-2"
          disabled={loading}
        />
      </div>

      <div className="max-h-44 space-y-1 overflow-auto rounded-md border border-foreground/10 bg-background/40 p-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-xs text-foreground/80">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              disabled={loading}
            />
            <span>
              {t("itemLabel", { label: item.label, score: item.fraudScore })}
            </span>
          </label>
        ))}
      </div>

      <Button type="button" onClick={submit} disabled={loading}>
        {loading ? t("processing") : t("applyChanges")}
      </Button>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

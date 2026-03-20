"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type RepeatRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestDateKey: string;
  createdAt: string;
  reviewNote: string | null;
  user: {
    name: string | null;
    email: string;
  };
};

export default function AdminCampaignRepeatControls({
  campaignId,
  initialRepeatAccessMode,
  requests,
}: {
  campaignId: string;
  initialRepeatAccessMode: "OPEN" | "REQUESTED_ONLY" | "REQUESTED_PLUS_NEW";
  requests: RepeatRequest[];
}) {
  const t = useTranslations("admin.repeatCampaigns");
  const router = useRouter();
  const [mode, setMode] = useState(initialRepeatAccessMode);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(requests.map((item) => [item.id, item.reviewNote || ""]))
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const counts = {
    pending: requests.filter((item) => item.status === "PENDING").length,
    approved: requests.filter((item) => item.status === "APPROVED").length,
    rejected: requests.filter((item) => item.status === "REJECTED").length,
  };

  async function saveMode() {
    setLoading("mode");
    setMessage("");
    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}/repeat-access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ repeatAccessMode: mode }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Unable to update repeat rule.");
      return;
    }
    setMessage(data.message || t("messages.ruleUpdated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function updateRequest(requestId: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    setLoading(`${requestId}:${status}`);
    setMessage("");
    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}/repeat-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        status,
        reviewNote: notes[requestId] || "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Unable to review request.");
      return;
    }
    setMessage(data.message || t("messages.requestUpdated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Tomorrow repeat requests</p>
        <p className="text-sm text-foreground/65">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200/80">{t("cards.pending.title")}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.pending}</p>
          <p className="mt-2 text-sm text-foreground/60">{t("cards.pending.body")}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200/80">{t("cards.approved.title")}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.approved}</p>
          <p className="mt-2 text-sm text-foreground/60">{t("cards.approved.body")}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200/80">{t("cards.rejected.title")}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.rejected}</p>
          <p className="mt-2 text-sm text-foreground/60">{t("cards.rejected.body")}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/75">{t("ruleLabel")}</label>
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "OPEN" | "REQUESTED_ONLY" | "REQUESTED_PLUS_NEW")
            }
            className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="OPEN">{t("modes.open")}</option>
            <option value="REQUESTED_ONLY">{t("modes.requestedOnly")}</option>
            <option value="REQUESTED_PLUS_NEW">{t("modes.requestedPlusNew")}</option>
          </select>
        </div>
        <Button onClick={() => void saveMode()} disabled={loading !== null} className="w-full lg:w-auto">
          {loading === "mode" ? t("saving") : t("saveRule")}
        </Button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/10 bg-background/40 px-4 py-5 text-sm text-foreground/60">
            {t("empty")}
          </div>
        ) : null}
        {requests.map((item) => (
          <div key={item.id} className="rounded-xl border border-foreground/10 bg-background/55 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{item.user.name?.trim() || item.user.email}</p>
                  <span className="rounded-full border border-foreground/10 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/55">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-foreground/55">{item.user.email}</p>
                <p className="text-xs text-foreground/55">
                  {t("requestedFor", {
                    date: item.requestDateKey,
                    createdAt: new Date(item.createdAt).toLocaleString("en-IN"),
                  })}
                </p>
                <textarea
                  value={notes[item.id] || ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="min-h-[72px] w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15"
                  placeholder={t("reviewNotePlaceholder")}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                {item.status !== "APPROVED" ? (
                  <Button
                    onClick={() => void updateRequest(item.id, "APPROVED")}
                    disabled={loading !== null}
                    className="w-full sm:w-auto"
                  >
                    {loading === `${item.id}:APPROVED` ? t("saving") : t("approve")}
                  </Button>
                ) : null}
                {item.status !== "REJECTED" ? (
                  <Button
                    variant="destructive"
                    onClick={() => void updateRequest(item.id, "REJECTED")}
                    disabled={loading !== null}
                    className="w-full sm:w-auto"
                  >
                    {loading === `${item.id}:REJECTED` ? t("saving") : t("reject")}
                  </Button>
                ) : null}
                {item.status !== "PENDING" ? (
                  <Button
                    variant="outline"
                    onClick={() => void updateRequest(item.id, "PENDING")}
                    disabled={loading !== null}
                    className="w-full sm:w-auto"
                  >
                    {loading === `${item.id}:PENDING` ? t("saving") : t("moveToPending")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

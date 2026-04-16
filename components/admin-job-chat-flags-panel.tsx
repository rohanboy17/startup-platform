"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type FlagStatus = "PENDING" | "REVIEWED" | "DISMISSED";

type FlagPayload = {
  summary: {
    pending: number;
    reviewed: number;
    dismissed: number;
  };
  flags: Array<{
    id: string;
    message: string;
    senderRole: "USER" | "BUSINESS";
    detectedReasons: string[];
    status: FlagStatus;
    adminNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    application: {
      id: string;
      job: {
        id: string;
        title: string;
        business: {
          name: string | null;
        };
      };
      user: {
        name: string | null;
      };
    };
  }>;
  error?: string;
};

function toneForStatus(status: FlagStatus) {
  if (status === "PENDING") return "warning" as const;
  if (status === "REVIEWED") return "success" as const;
  return "neutral" as const;
}

export default function AdminJobChatFlagsPanel() {
  const t = useTranslations("admin.chatFlagsPage");
  const locale = useLocale();
  const [status, setStatus] = useState<"ALL" | FlagStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<FlagPayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyFlagId, setBusyFlagId] = useState("");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/v2/admin/job-chat-flags?${params.toString()}`, { credentials: "include" });
    const raw = await res.text();
    let parsed: FlagPayload = { summary: { pending: 0, reviewed: 0, dismissed: 0 }, flags: [] };
    try {
      parsed = raw ? (JSON.parse(raw) as FlagPayload) : parsed;
    } catch {
      setError(t("errors.unexpected"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    setData(parsed);
    setDraftNotes((current) => {
      const next = { ...current };
      for (const flag of parsed.flags) {
        if (typeof next[flag.id] === "undefined") {
          next[flag.id] = flag.adminNote || "";
        }
      }
      return next;
    });
  }, [query, status, t]);

  useLiveRefresh(load, 12000);

  const visibleFlags = useMemo(() => data?.flags || [], [data]);

  async function updateFlag(flagId: string, action: "REVIEW" | "DISMISS") {
    setBusyFlagId(flagId);
    setMessage("");
    const res = await fetch(`/api/v2/admin/job-chat-flags/${flagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, adminNote: draftNotes[flagId] || "" }),
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }
    setBusyFlagId("");
    if (!res.ok) {
      setMessage(parsed.error || t("errors.failedToUpdate"));
      return;
    }
    setMessage(parsed.message || t("messages.updated"));
    emitDashboardLiveRefresh();
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpis.pending")} value={data?.summary.pending || 0} tone="warning" />
        <KpiCard label={t("kpis.reviewed")} value={data?.summary.reviewed || 0} tone="success" />
        <KpiCard label={t("kpis.dismissed")} value={data?.summary.dismissed || 0} />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/55">{t("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t("title")}</h3>
          <p className="mt-1 text-sm text-foreground/65">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="border-foreground/15 bg-background/60 pl-10 text-foreground placeholder:text-foreground/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "REVIEWED", "DISMISSED", "ALL"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  status === item
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                    : "border-foreground/10 bg-background/60 text-foreground/70 hover:bg-background/80 hover:text-foreground"
                }`}
              >
                {t(`filters.status.${item}`)}
              </button>
            ))}
          </div>
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      </SectionCard>

      {visibleFlags.length === 0 ? (
        <SectionCard className="border-dashed border-foreground/15 p-6 text-sm text-foreground/60">
          {t("empty")}
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {visibleFlags.map((flag) => (
            <SectionCard key={flag.id} elevated className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-foreground/60">
                      <ShieldAlert size={14} />
                      {t(`senderRole.${flag.senderRole}`)}
                    </div>
                    <StatusBadge label={t(`status.${flag.status}`)} tone={toneForStatus(flag.status)} />
                  </div>
                  <p className="text-lg font-semibold text-foreground">{flag.application.job.title}</p>
                  <p className="text-sm text-foreground/65">
                    {t("card.threadLine", {
                      candidate: flag.application.user.name || t("fallback.candidate"),
                      business: flag.application.job.business.name || t("fallback.business"),
                    })}
                  </p>
                </div>
                <p className="text-xs text-foreground/55">{new Date(flag.createdAt).toLocaleString(locale)}</p>
              </div>

              <div className="rounded-2xl border border-foreground/10 bg-background/65 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("card.message")}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{flag.message}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {flag.detectedReasons.map((reason) => (
                  <span
                    key={`${flag.id}:${reason}`}
                    className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-800 dark:text-amber-100"
                  >
                    {reason}
                  </span>
                ))}
              </div>

              <textarea
                value={draftNotes[flag.id] || ""}
                onChange={(event) =>
                  setDraftNotes((current) => ({
                    ...current,
                    [flag.id]: event.target.value.slice(0, 800),
                  }))
                }
                placeholder={t("card.notePlaceholder")}
                className="min-h-[96px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busyFlagId === flag.id}
                  onClick={() => void updateFlag(flag.id, "REVIEW")}
                >
                  {busyFlagId === flag.id ? t("actions.reviewing") : t("actions.review")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyFlagId === flag.id}
                  onClick={() => void updateFlag(flag.id, "DISMISS")}
                >
                  {busyFlagId === flag.id ? t("actions.dismissing") : t("actions.dismiss")}
                </Button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

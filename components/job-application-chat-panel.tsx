"use client";

import { useCallback, useMemo, useState } from "react";
import { MessageSquare, Shield, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";
import { JOB_APPLICATION_CHAT_REFRESH_MS } from "@/lib/job-application-chat";

type ChatMessage = {
  id: string;
  message: string;
  createdAt: string;
  senderRole: "USER" | "BUSINESS";
  senderUserId: string;
  senderName: string | null;
};

type ChatPayload = {
  canSend: boolean;
  visibleToAdmin: boolean;
  messages: ChatMessage[];
  thread: {
    applicationId: string;
    status: string;
    candidateName?: string;
    businessName?: string;
    jobTitle: string;
  };
  error?: string;
};

type ChatMode = "business" | "user" | "admin";

function getApiPath(mode: ChatMode, applicationId: string, jobId?: string) {
  if (mode === "business") {
    return `/api/v2/business/jobs/${jobId}/applications/${applicationId}/messages`;
  }
  if (mode === "user") {
    return `/api/v2/users/me/job-applications/${applicationId}/messages`;
  }
  return `/api/v2/admin/job-applications/${applicationId}/messages`;
}

export default function JobApplicationChatPanel({
  mode,
  applicationId,
  jobId,
}: {
  mode: ChatMode;
  applicationId: string;
  jobId?: string;
}) {
  const t = useTranslations("jobChat");
  const locale = useLocale();
  const [data, setData] = useState<ChatPayload | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const apiPath = useMemo(() => getApiPath(mode, applicationId, jobId), [applicationId, jobId, mode]);
  const ownRole = mode === "user" ? "USER" : mode === "business" ? "BUSINESS" : null;

  const load = useCallback(async () => {
    const res = await fetch(apiPath, { credentials: "include" });
    const raw = await res.text();
    let parsed: ChatPayload = {
      canSend: false,
      visibleToAdmin: true,
      messages: [],
      thread: { applicationId, status: "", jobTitle: "" },
    };
    try {
      parsed = raw ? (JSON.parse(raw) as ChatPayload) : parsed;
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
  }, [apiPath, applicationId, t]);

  useLiveRefresh(load, JOB_APPLICATION_CHAT_REFRESH_MS);

  async function sendMessage() {
    if (!data?.canSend || mode === "admin") return;
    const nextMessage = draft.trim();
    if (!nextMessage) return;

    setBusy(true);
    setMessage("");
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: nextMessage }),
    });
    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpected") };
    }

    setBusy(false);
    if (!res.ok) {
      setMessage(parsed.error || t("errors.failedToSend"));
      return;
    }

    setDraft("");
    setMessage(parsed.message || t("messages.sent"));
    emitDashboardLiveRefresh();
    void load();
  }

  if (error) {
    return (
      <SectionCard className="border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </SectionCard>
    );
  }

  if (!data) {
    return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  }

  return (
    <SectionCard elevated className="space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          </div>
          <p className="text-xs text-foreground/55">
            {mode === "business"
              ? t("subtitleBusiness", {
                  candidate: data.thread.candidateName || t("fallback.candidate"),
                  job: data.thread.jobTitle,
                })
              : mode === "user"
                ? t("subtitleUser", {
                    business: data.thread.businessName || t("fallback.business"),
                    job: data.thread.jobTitle,
                  })
                : t("subtitleAdmin", {
                    business: data.thread.businessName || t("fallback.business"),
                    candidate: data.thread.candidateName || t("fallback.candidate"),
                  })}
          </p>
        </div>
        {data.visibleToAdmin ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/55">
            <Shield size={12} />
            {t("adminVisible")}
          </div>
        ) : null}
      </div>

      <div className="max-h-[24rem] space-y-3 overflow-y-auto rounded-2xl border border-foreground/10 bg-background/60 p-3 sm:p-4">
        {data.messages.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("empty")}</p>
        ) : (
          data.messages.map((item) => {
            const isOwn = ownRole ? item.senderRole === ownRole : item.senderRole === "BUSINESS";
            return (
              <div key={item.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 shadow-sm sm:max-w-[78%] ${
                    item.senderRole === "BUSINESS"
                      ? "rounded-br-md bg-foreground text-background"
                      : "rounded-bl-md border border-foreground/10 bg-foreground/[0.05] text-foreground"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] opacity-75">
                    <span>
                      {item.senderRole === "BUSINESS" ? t("roles.business") : t("roles.candidate")}
                    </span>
                    {item.senderName ? <span className="truncate normal-case tracking-normal">{item.senderName}</span> : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.message}</p>
                  <p className="mt-2 text-[11px] opacity-70">
                    {new Date(item.createdAt).toLocaleString(locale, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {mode !== "admin" && data.canSend ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
            placeholder={t("placeholder")}
            className="min-h-[108px] w-full rounded-2xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/55">{t("note")}</p>
            <Button type="button" disabled={busy || draft.trim().length === 0} onClick={() => void sendMessage()}>
              <Send size={16} />
              {busy ? t("sending") : t("send")}
            </Button>
          </div>
        </div>
      ) : null}

      {mode !== "admin" && !data.canSend ? (
        <p className="text-sm text-foreground/60">{t("availableAfterHire")}</p>
      ) : null}

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
    </SectionCard>
  );
}

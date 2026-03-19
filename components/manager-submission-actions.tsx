"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function ManagerSubmissionActions({ submissionId }: { submissionId: string }) {
  const t = useTranslations("manager.submissionActions");
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | "ESCALATE" | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  async function review(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("errors.unexpected") };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || t("errors.actionFailed"));
      return;
    }

    setReason("");
    setMessage(data.message || t("updated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function escalate() {
    setLoading("ESCALATE");
    setMessage("");

    const res = await fetch(`/api/v2/submissions/${submissionId}/manager-escalate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("errors.unexpected") };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || t("errors.actionFailed"));
      return;
    }

    setReason("");
    setMessage(data.message || t("escalated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="md:relative">
      <div className="sticky bottom-4 z-20 space-y-3 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-xl shadow-black/40 backdrop-blur-md md:static md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 md:bg-black/20"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => void review("APPROVE")}
            disabled={loading !== null}
            className="min-h-11 w-full px-5 sm:w-auto"
          >
            {loading === "APPROVE" ? t("approving") : t("approve")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void review("REJECT")}
            disabled={loading !== null}
            className="min-h-11 w-full px-5 sm:w-auto"
          >
            {loading === "REJECT" ? t("rejecting") : t("reject")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void escalate()}
            disabled={loading !== null}
            className="min-h-11 w-full px-5 sm:w-auto"
          >
            {loading === "ESCALATE" ? t("escalating") : t("escalate")}
          </Button>
        </div>
        {message ? <p className="text-xs text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminJobApplicationActions({
  applicationId,
}: {
  applicationId: string;
}) {
  const t = useTranslations("admin.jobsPage.applicationActions");
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | "SHORTLIST" | "SCHEDULE_INTERVIEW" | null>(null);
  const [reason, setReason] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [message, setMessage] = useState("");

  async function review(action: "APPROVE" | "REJECT" | "SHORTLIST" | "SCHEDULE_INTERVIEW") {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/admin/job-applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason, interviewAt }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("unexpected") };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(parsed.error || t("actionFailed"));
      return;
    }

    setReason("");
    if (action === "SCHEDULE_INTERVIEW") {
      setInterviewAt("");
    }
    setMessage(parsed.message || t("saved"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-[0.18em] text-foreground/55">
          {t("interviewLabel")}
        </label>
        <input
          type="datetime-local"
          value={interviewAt}
          onChange={(e) => setInterviewAt(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-4 text-sm text-foreground outline-none"
        />
        <p className="text-xs text-foreground/55">{t("interviewHelp")}</p>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("reasonPlaceholder")}
        rows={3}
        className="w-full resize-none rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/45"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => void review("SHORTLIST")}
          disabled={loading !== null}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading === "SHORTLIST" ? t("shortlisting") : t("shortlist")}
        </Button>
        <Button
          variant="outline"
          onClick={() => void review("SCHEDULE_INTERVIEW")}
          disabled={loading !== null}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading === "SCHEDULE_INTERVIEW" ? t("schedulingInterview") : t("scheduleInterview")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => void review("APPROVE")} disabled={loading !== null} className="min-h-11 w-full sm:w-auto">
          {loading === "APPROVE" ? t("approving") : t("approve")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => void review("REJECT")}
          disabled={loading !== null}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading === "REJECT" ? t("rejecting") : t("reject")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}

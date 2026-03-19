"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type ReviewAction = "APPROVE" | "REJECT";

export default function AdminBusinessFundingActions({
  fundingId,
}: {
  fundingId: string;
}) {
  const t = useTranslations("admin.fundingActions");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loadingAction, setLoadingAction] = useState<ReviewAction | null>(null);
  const [message, setMessage] = useState("");

  async function submit(action: ReviewAction) {
    if (action === "REJECT" && !note.trim()) {
      setMessage(t("noteRequired"));
      return;
    }

    setLoadingAction(action);
    setMessage("");

    const res = await fetch(`/api/admin/funding/${fundingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        reviewNote: note.trim() || undefined,
      }),
    });

    const raw = await res.text();
    let parsed: { message?: string; error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      parsed = { error: t("unexpectedServerResponse") };
    }

    setLoadingAction(null);
    setMessage(parsed.message || parsed.error || t("updated"));

    if (res.ok) {
      setNote("");
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("notePlaceholder")}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => void submit("APPROVE")}
          disabled={loadingAction !== null}
          className="w-full sm:w-auto"
        >
          {loadingAction === "APPROVE" ? t("approveLoading") : t("approve")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void submit("REJECT")}
          disabled={loadingAction !== null}
          className="w-full sm:w-auto"
        >
          {loadingAction === "REJECT" ? t("rejectLoading") : t("reject")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/65">{message}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EligibleRole = "USER" | "BUSINESS" | null;

export default function HomeFeedbackSubmitCard({
  currentRole,
  defaultDisplayName,
  existingFeedback,
}: {
  currentRole: EligibleRole;
  defaultDisplayName: string;
  existingFeedback: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    quote: string;
    createdAt: string;
  } | null;
}) {
  const t = useTranslations("home.testimonials");
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [quote, setQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const underReview = existingFeedback?.status === "PENDING";

  async function submitFeedback() {
    if (!currentRole || underReview) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/community-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        displayName,
        quote,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || t("submitError"));
      return;
    }

    setQuote("");
    setMessage(data.message || t("submitSuccess"));
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-foreground/10 bg-foreground/5 p-6 shadow-[0_20px_70px_-44px_rgba(15,23,42,0.25)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-500">
          <MessageSquare size={20} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{t("feedbackCardTitle")}</h3>
          <p className="text-sm leading-6 text-foreground/70">{t("feedbackCardBody")}</p>
        </div>
      </div>

      {currentRole ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 text-xs uppercase tracking-[0.18em] text-foreground/55">
            {t("loggedInAs", { role: currentRole === "BUSINESS" ? t("businessRole") : t("userRole") })}
          </div>
          {existingFeedback ? (
            <div
              className={`rounded-2xl border px-4 py-4 text-sm ${
                existingFeedback.status === "APPROVED"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : existingFeedback.status === "REJECTED"
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              }`}
            >
              <p className="font-semibold">
                {existingFeedback.status === "APPROVED"
                  ? t("statusApproved")
                  : existingFeedback.status === "REJECTED"
                    ? t("statusRejected")
                    : t("statusPending")}
              </p>
              <p className="mt-1 leading-6">
                {existingFeedback.status === "APPROVED"
                  ? t("approvedHelp")
                  : existingFeedback.status === "REJECTED"
                    ? t("rejectedHelp")
                    : t("underReviewHelp")}
              </p>
              <p className="mt-3 rounded-xl border border-current/15 bg-background/40 px-3 py-3 text-sm text-foreground/75 dark:text-white/80">
                {existingFeedback.quote}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/75">{t("displayNameLabel")}</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("displayNamePlaceholder")}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/75">{t("feedbackLabel")}</label>
            <textarea
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              placeholder={t("feedbackPlaceholder")}
              maxLength={280}
              className="min-h-[132px] w-full rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/55">
              {underReview ? t("pendingBlockedHelp") : t("pendingHelp")}
            </p>
            <Button onClick={() => void submitFeedback()} disabled={submitting || quote.trim().length < 24 || underReview}>
              <Send size={16} />
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </div>
          {message ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-6 text-foreground/70">{t("loginPrompt")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">{t("loginCta")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">{t("registerCta")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

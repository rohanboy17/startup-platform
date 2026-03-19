"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type Locale = "en" | "hi" | "bn";

export default function LanguageSelect({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [locale, setLocale] = useState<Locale>(activeLocale || "en");

  const options = useMemo(
    () => [
      { value: "en" as const, label: t("languages.en") },
      { value: "hi" as const, label: t("languages.hi") },
      { value: "bn" as const, label: t("languages.bn") },
    ],
    [t]
  );

  const save = useCallback(
    async (next: Locale) => {
      setLoading(true);
      setMessage("");
      setLocale(next);

      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locale: next }),
      });

      const raw = await res.text();
      let parsed: { error?: string } = {};
      try {
        parsed = raw ? (JSON.parse(raw) as { error?: string }) : {};
      } catch {
        parsed = { error: "Unexpected server response" };
      }

      setLoading(false);

      if (!res.ok) {
        setMessage(parsed.error || "Unable to change language");
        return;
      }

      router.refresh();
    },
    [router]
  );

  return (
    <div className={className}>
      <select
        value={locale}
        disabled={loading}
        onChange={(e) => void save((e.target.value as Locale) || "en")}
        className={
          compact
            ? "h-9 w-full rounded-full border border-foreground/15 bg-background px-3 text-xs text-foreground outline-none transition focus:border-emerald-400/50 disabled:opacity-70 sm:text-sm"
            : "min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-400/50 disabled:opacity-70"
        }
        aria-label={t("settings.languageLabel")}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {message ? <p className="mt-2 text-sm text-rose-400">{message}</p> : null}
    </div>
  );
}

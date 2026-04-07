"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLiveRefresh } from "@/lib/live-refresh";
import { getUserProfileCompletion } from "@/lib/user-profile";

type SettingsPayload = {
  profile: {
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    gender: string | null;
    religion: string | null;
    dateOfBirth: string | null;
    workMode: string | null;
    educationQualification: string | null;
    courseAndCertificate: string | null;
    workTime: string | null;
    workingPreference: string | null;
    languages: string[];
  };
};

type SkillsPayload = {
  skills: Array<{ label: string }>;
};

const SEEN_KEY = "earnhub:user_profile_prompt_seen_v1";

export default function UserProfileCompletionPrompt() {
  const t = useTranslations("user.profileCompletion");
  const [loading, setLoading] = useState(true);
  const [percentage, setPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const seen = hydrated
    ? (() => {
        try {
          return window.sessionStorage.getItem(SEEN_KEY) || "";
        } catch {
          return "";
        }
      })()
    : "";

  const load = useCallback(async () => {
    const [settingsRes, skillsRes] = await Promise.all([
      fetch("/api/v2/users/me/settings", { cache: "no-store" }),
      fetch("/api/v2/users/me/skills", { cache: "no-store" }),
    ]);

    if (!settingsRes.ok || !skillsRes.ok) {
      setLoading(false);
      return;
    }

    const [settingsPayload, skillsPayload] = (await Promise.all([
      settingsRes.json(),
      skillsRes.json(),
    ])) as [SettingsPayload, SkillsPayload];

    const completion = getUserProfileCompletion(
      settingsPayload.profile,
      skillsPayload.skills.map((item) => item.label)
    );

    setPercentage(completion.percentage);
    setIsComplete(completion.isComplete);
    setLoading(false);
  }, []);

  useLiveRefresh(load, 60000);

  function markSeen() {
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  const open = hydrated && !loading && !isComplete && !dismissed && !seen;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("prompt.close")}
        className="absolute inset-0 bg-background/50 backdrop-blur-sm"
        onClick={() => {
          markSeen();
          setDismissed(true);
        }}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-foreground/10 bg-background/95 p-5 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">
              {t("prompt.eyebrow")}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {t("prompt.title")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              {t("prompt.body")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              markSeen();
              setDismissed(true);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.03] text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">
              {t("progressLabel")}
            </p>
            <p className="text-lg font-semibold text-foreground">{percentage}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/user/profile"
            onClick={() => {
              markSeen();
              setDismissed(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            {t("cta")}
          </Link>
          <button
            type="button"
            onClick={() => {
              markSeen();
              setDismissed(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-foreground/15 bg-foreground/[0.03] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground"
          >
            {t("prompt.notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}

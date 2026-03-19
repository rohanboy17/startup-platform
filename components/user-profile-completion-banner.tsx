"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { useLiveRefresh } from "@/lib/live-refresh";
import { getUserProfileCompletion } from "@/lib/user-profile";

type SettingsPayload = {
  profile: {
    name: string | null;
    address: string | null;
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

export default function UserProfileCompletionBanner({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const t = useTranslations("user.profileCompletion");
  const [loading, setLoading] = useState(true);
  const [percentage, setPercentage] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

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
    setMissing(completion.missing);
    setIsComplete(completion.isComplete);
    setLoading(false);
  }, []);

  useLiveRefresh(load, 60000);

  const missingLabels = useMemo(
    () => missing.slice(0, 4).map((item) => t(`fields.${item}`)),
    [missing, t]
  );

  if (loading) {
    return null;
  }

  if (variant === "compact" && isComplete) {
    return null;
  }

  return (
    <SectionCard
      elevated
      className={
        variant === "full"
          ? "overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10"
          : "overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10"
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">
              {variant === "full" ? t("full.eyebrow") : t("compact.eyebrow")}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              {variant === "full" ? t("full.title") : t("compact.title")}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-foreground/70">
              {isComplete
                ? t("full.completeBody")
                : variant === "full"
                  ? t("full.body")
                  : t("compact.body")}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-foreground/10 bg-background/70 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/50">{t("progressLabel")}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{percentage}%</p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {!isComplete ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {missingLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-foreground/10 bg-background/75 px-3 py-1 text-xs font-medium text-foreground/75"
                >
                  {label}
                </span>
              ))}
            </div>

            <Link
              href="/dashboard/user/profile"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              {t("cta")}
            </Link>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

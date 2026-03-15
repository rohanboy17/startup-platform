"use client";

import { useTranslations } from "next-intl";
import LanguageSelect from "@/components/language-select";

export default function LanguageSettingsCard() {
  const t = useTranslations("settings");

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
      <p className="font-medium text-foreground">{t("languageTitle")}</p>
      <p className="mt-1">{t("languageHelp")}</p>
      <div className="mt-3 max-w-sm">
        <LanguageSelect />
      </div>
    </div>
  );
}


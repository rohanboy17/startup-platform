"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("common.themeToggle");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const nextThemeLabel = isDark ? t("lightMode") : t("darkMode");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.04] text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground",
        compact ? "h-9 w-9" : "px-3 py-1.5 text-xs font-medium sm:text-sm",
        className
      )}
      aria-label={t("toggleLabel")}
      title={mounted ? t("switchTo", { mode: nextThemeLabel }) : t("toggleLabel")}
    >
      {!mounted ? (
        <span className={compact ? "block size-4" : "block h-4 w-4"} />
      ) : isDark ? (
        <>
          <Sun size={16} />
          {!compact ? <span>{t("light")}</span> : null}
        </>
      ) : (
        <>
          <Moon size={16} />
          {!compact ? <span>{t("dark")}</span> : null}
        </>
      )}
    </button>
  );
}

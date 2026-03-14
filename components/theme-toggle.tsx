"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.04] text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground",
        compact ? "h-9 w-9" : "px-3 py-1.5 text-xs font-medium sm:text-sm",
        className
      )}
      aria-label="Toggle theme"
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {!mounted ? (
        <span className={compact ? "block size-4" : "block h-4 w-4"} />
      ) : resolvedTheme === "dark" ? (
        <>
          <Sun size={16} />
          {!compact ? <span>Light</span> : null}
        </>
      ) : (
        <>
          <Moon size={16} />
          {!compact ? <span>Dark</span> : null}
        </>
      )}
    </button>
  );
}

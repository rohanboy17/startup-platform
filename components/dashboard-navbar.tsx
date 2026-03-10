"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export default function DashboardNavbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 md:mb-10">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pr-3 text-2xl font-semibold leading-tight md:text-3xl"
      >
        Admin Overview
      </motion.h1>

      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="rounded-lg bg-muted p-2 transition hover:scale-105"
        aria-label="Toggle theme"
      >
        {!mounted ? (
          <span className="block size-[18px]" />
        ) : resolvedTheme === "dark" ? (
          <Sun size={18} />
        ) : (
          <Moon size={18} />
        )}
      </button>
    </div>
  );
}

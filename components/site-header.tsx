"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import PwaInstallButton from "@/components/pwa-install-button";
import ThemeToggle from "@/components/theme-toggle";
import LanguageSelect from "@/components/language-select";

function isDashboardPath(pathname: string) {
  return pathname.startsWith("/dashboard");
}

export default function SiteHeader() {
  const t = useTranslations("header");
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";
  const onDashboard = isDashboardPath(pathname);

  const sectionLinks = useMemo(
    () => [
      { label: t("howItWorks"), href: onHome ? "#how-it-works" : "/#how-it-works" },
      { label: t("trust"), href: onHome ? "#trust" : "/#trust" },
      { label: t("liveActivity"), href: onHome ? "#live-activity" : "/#live-activity" },
    ],
    [onHome, t]
  );

  const primaryLinks = useMemo(
    () => [
      { label: t("home"), href: "/" },
      { label: t("about"), href: "/about" },
      { label: t("faq"), href: "/faq" },
      { label: t("contact"), href: "/contact" },
    ],
    [t]
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-background/82 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.28)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_15%_-20%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_85%_-20%,rgba(56,189,248,0.16),transparent_40%)]" />
      <div className="relative mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-2 px-3 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href={onDashboard ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-2.5 py-1.5 text-sm font-semibold tracking-tight text-foreground transition hover:bg-foreground/[0.08]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
            <span>FreeEarnHub</span>
          </Link>

          <nav className={`${onDashboard ? "hidden" : "hidden md:flex"} items-center gap-1 text-sm text-foreground/75`}>
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  pathname === item.href
                    ? "bg-foreground text-background shadow-sm"
                    : "hover:bg-foreground/[0.08] hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {!onDashboard ? (
          <nav className="hidden items-center gap-1 text-sm text-foreground/70 xl:flex">
            {sectionLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1.5 transition hover:bg-foreground/[0.08] hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          <div className="w-[140px]">
            <LanguageSelect compact />
          </div>
          <PwaInstallButton />
          <Link
            href={onDashboard ? "/dashboard" : "/login"}
            className="rounded-full border border-foreground/20 bg-foreground/[0.04] px-3 py-1.5 text-xs font-medium text-foreground/75 transition hover:bg-foreground/[0.08] hover:text-foreground sm:text-sm"
          >
            {onDashboard ? t("dashboardHome") : t("signIn")}
          </Link>
          {!onDashboard ? (
            <Link
              href="/register"
              className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-[0_10px_25px_-12px_rgba(255,255,255,0.9)] transition hover:opacity-90 sm:text-sm"
            >
              {t("register")}
            </Link>
          ) : null}
        </div>

        {!onDashboard ? (
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle compact />
            <PwaInstallButton compact />
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.04] text-foreground/70 transition hover:bg-foreground/[0.08]"
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        ) : null}
      </div>

      {open && !onDashboard ? (
        <div className="relative border-t border-foreground/10 bg-background/95 p-3 shadow-2xl shadow-black/10 sm:hidden">
          <div className="grid gap-1 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-2 text-sm text-foreground/75">
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-2 transition ${
                  pathname === item.href
                    ? "bg-foreground text-background shadow-sm"
                    : "hover:bg-foreground/[0.08] hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!onDashboard
              ? sectionLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))
              : null}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="col-span-2 flex justify-center">
                <ThemeToggle />
              </div>
              <div className="col-span-2">
                <LanguageSelect />
              </div>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-foreground/20 px-3 py-2 text-center text-xs font-medium text-foreground/75 transition hover:bg-foreground/[0.06] hover:text-foreground"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-full bg-foreground px-3 py-2 text-center text-xs font-semibold text-background transition hover:opacity-90"
              >
                {t("register")}
              </Link>
            </div>
            <PwaInstallButton mobile />
          </div>
        </div>
      ) : null}
    </header>
  );
}


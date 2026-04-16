"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PwaInstallButton from "@/components/pwa-install-button";
import ThemeToggle from "@/components/theme-toggle";
import LanguageSelect from "@/components/language-select";
import { cn } from "@/lib/utils";
import { useDashboardMobileNav } from "@/lib/dashboard-mobile-nav";

function isDashboardPath(pathname: string) {
  return pathname.startsWith("/dashboard");
}

export default function SiteHeader() {
  const t = useTranslations("header");
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [desktopGroup, setDesktopGroup] = useState<string | null>(null);
  const [mobileGroups, setMobileGroups] = useState({
    explore: true,
    sections: false,
  });
  const onHome = pathname === "/";
  const onDashboard = isDashboardPath(pathname);
  const { open: dashboardMobileOpen, toggle: toggleDashboardMobile } = useDashboardMobileNav();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exploreLinks = useMemo(
    () => [
      { label: t("home"), href: "/" },
      { label: t("services"), href: "/services" },
      { label: t("about"), href: "/about" },
      { label: t("faq"), href: "/faq" },
      { label: t("contact"), href: "/contact" },
    ],
    [t]
  );

  const sectionLinks = useMemo(
    () => [
      { label: t("howItWorks"), href: onHome ? "#how-it-works" : "/#how-it-works" },
      { label: t("trust"), href: onHome ? "#trust" : "/#trust" },
      { label: t("liveActivity"), href: onHome ? "#live-activity" : "/#live-activity" },
    ],
    [onHome, t]
  );

  const groupedNav = useMemo(
    () => [
      { id: "explore", label: t("groups.explore"), items: exploreLinks, kind: "link" as const },
      { id: "sections", label: t("groups.sections"), items: sectionLinks, kind: "anchor" as const },
    ],
    [exploreLinks, sectionLinks, t]
  );

  const toggleMobileGroup = (group: "explore" | "sections") => {
    setMobileGroups((current) => ({
      ...current,
      [group]: !current[group],
    }));
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (groupId: string) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setDesktopGroup((current) => (current === groupId ? null : current));
      closeTimerRef.current = null;
    }, 260);
  };

  const openDesktopMenu = (groupId: string) => {
    clearCloseTimer();
    setDesktopGroup(groupId);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-background/82 shadow-[0_10px_36px_-28px_rgba(0,0,0,0.24)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_15%_-20%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_85%_-20%,rgba(56,189,248,0.16),transparent_40%)]" />
      <div className="relative mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-3 sm:h-16 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <Link
            href={onDashboard ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-sm font-semibold tracking-tight text-foreground transition hover:bg-foreground/[0.08]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
            <span>FreeEarnHub</span>
          </Link>

          {!onDashboard ? (
            <nav className="hidden items-center gap-2 md:flex">
              {groupedNav.map((group) => (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => openDesktopMenu(group.id)}
                  onMouseLeave={() => scheduleClose(group.id)}
                >
                  <button
                    type="button"
                    onMouseEnter={() => openDesktopMenu(group.id)}
                    onClick={() => setDesktopGroup((current) => (current === group.id ? null : group.id))}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-foreground/75 transition",
                      desktopGroup === group.id
                        ? "bg-foreground/[0.08] text-foreground"
                        : "hover:bg-foreground/[0.08] hover:text-foreground"
                    )}
                    aria-expanded={desktopGroup === group.id}
                  >
                    {group.label}
                    <ChevronDown
                      size={15}
                      className={cn("transition", desktopGroup === group.id ? "rotate-180" : "rotate-0")}
                    />
                  </button>

                  <div
                    className={cn(
                      "absolute left-0 top-full mt-2 w-64 rounded-2xl border border-foreground/10 bg-background/95 p-2 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.24)] transition",
                      desktopGroup === group.id
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1 opacity-0"
                    )}
                  >
                    <div className="grid gap-1">
                      {group.items.map((item) =>
                        group.kind === "anchor" ? (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setDesktopGroup(null)}
                            className="rounded-xl px-3 py-2 text-sm text-foreground/72 transition hover:bg-foreground/[0.06] hover:text-foreground"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDesktopGroup(null)}
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm transition",
                              pathname === item.href
                                ? "bg-foreground text-background shadow-sm"
                                : "text-foreground/72 hover:bg-foreground/[0.06] hover:text-foreground"
                            )}
                          >
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <ThemeToggle />
          <div className="w-[140px]">
            <LanguageSelect compact />
          </div>
          <PwaInstallButton alwaysShow />
          <Link
            href={onDashboard ? "/dashboard" : "/login"}
            className="rounded-full border border-foreground/20 bg-foreground/[0.04] px-3 py-1.5 text-xs font-medium text-foreground/75 transition hover:bg-foreground/[0.08] hover:text-foreground sm:text-sm"
          >
            {onDashboard ? t("dashboardHome") : t("signIn")}
          </Link>
          {!onDashboard ? (
            <Link
              href="/register"
              className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-[0_8px_22px_-12px_rgba(15,23,42,0.28)] transition hover:opacity-90 sm:text-sm"
            >
              {t("register")}
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 sm:hidden">
          <ThemeToggle compact />
          <PwaInstallButton compact alwaysShow />
          {onDashboard ? (
            <button
              type="button"
              onClick={toggleDashboardMobile}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.04] text-foreground/70 transition hover:bg-foreground/[0.08]"
              aria-label={t("toggleNavigation")}
              aria-expanded={dashboardMobileOpen}
            >
              {dashboardMobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.04] text-foreground/70 transition hover:bg-foreground/[0.08]"
              aria-label={t("toggleNavigation")}
              aria-expanded={open}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}
        </div>
      </div>

      {open && !onDashboard ? (
        <div className="relative border-t border-foreground/10 bg-background/95 p-3 shadow-2xl shadow-black/10 sm:hidden">
          <div className="grid gap-2 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-2 text-sm text-foreground/75">
            {groupedNav.map((group) => (
              <div key={group.id} className="rounded-2xl border border-foreground/10 bg-background/66">
                <button
                  type="button"
                  onClick={() => toggleMobileGroup(group.id as "explore" | "sections")}
                  className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium text-foreground"
                  aria-expanded={mobileGroups[group.id as "explore" | "sections"]}
                >
                  {group.label}
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition",
                      mobileGroups[group.id as "explore" | "sections"] ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid gap-1 px-2 pb-2",
                    mobileGroups[group.id as "explore" | "sections"] ? "grid" : "hidden"
                  )}
                >
                  {group.items.map((item) =>
                    group.kind === "anchor" ? (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="rounded-xl px-3 py-2 text-sm text-foreground/72 transition hover:bg-foreground/[0.06] hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-sm transition",
                          pathname === item.href
                            ? "bg-foreground text-background shadow-sm"
                            : "text-foreground/72 hover:bg-foreground/[0.06] hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
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
          </div>
        </div>
      ) : null}
    </header>
  );
}

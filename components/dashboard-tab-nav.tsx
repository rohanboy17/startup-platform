"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ComponentType } from "react";
import {
  KeyRound,
  Menu,
  X,
  BarChart3,
  Bell,
  CircleDollarSign,
  ClipboardCheck,
  Circle,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PlusCircle,
  ScrollText,
  Users,
  Wallet,
  ArrowUpCircle,
  AlertTriangle,
  Settings2,
  Gift,
  Sparkles,
} from "lucide-react";
import { useLiveRefresh } from "@/lib/live-refresh";
import LogoutButton from "@/components/logout-button";
import ThemeToggle from "@/components/theme-toggle";
import { useTranslations } from "next-intl";

type DashboardRole = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
type IconName =
  | "overview"
  | "campaigns"
  | "reviews"
  | "users"
  | "withdrawals"
  | "revenue"
  | "audit"
  | "analytics"
  | "create"
  | "funding"
  | "tasks"
  | "submissions"
  | "wallet"
  | "notifications"
  | "settings"
  | "help"
  | "risk"
  | "cms"
  | "trust"
  | "referrals"
  | "skills"
  | "profile";

type Item = {
  key: string;
  href: string;
  label: string;
  labelKey?: string;
  icon: IconName;
  matchPrefix?: string;
};

const iconMap: Record<IconName, ComponentType<{ size?: number }>> = {
  overview: LayoutDashboard,
  campaigns: Megaphone,
  reviews: ClipboardCheck,
  users: Users,
  withdrawals: ArrowUpCircle,
  revenue: Landmark,
  audit: ScrollText,
  analytics: BarChart3,
  create: PlusCircle,
  funding: CircleDollarSign,
  tasks: ListChecks,
  submissions: ClipboardCheck,
  wallet: Wallet,
  notifications: Bell,
  settings: Settings2,
  help: ScrollText,
  risk: AlertTriangle,
  cms: Settings2,
  trust: ScrollText,
  referrals: Gift,
  skills: Sparkles,
  profile: Users,
};

type NavAlertsResponse = {
  tabs: Record<string, string>;
  counts?: Record<string, number>;
};

export default function DashboardTabNav({
  displayName,
  role,
  userId,
  items,
  showForgotPasswordInNav = false,
}: {
  displayName: string;
  role: DashboardRole;
  userId: string;
  items: Item[];
  showForgotPasswordInNav?: boolean;
}) {
  const tGreeting = useTranslations("dashboard.greeting");
  const tNav = useTranslations("dashboard.nav");
  const tShell = useTranslations("dashboard.shell");
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const storagePrefix = `nav_seen:${userId}:`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/nav-alerts?role=${role}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as NavAlertsResponse;
    setAlerts(body.tabs || {});
    setCounts(body.counts || {});
  }, [role]);

  useLiveRefresh(load, 10000);

  useEffect(() => {
    const updateHour = () => setHour(new Date().getHours());
    updateHour();
    const timer = window.setInterval(updateHour, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    for (const item of items) {
      const isCurrent = item.matchPrefix
        ? pathname === item.href || pathname.startsWith(item.matchPrefix)
        : pathname === item.href;
      if (!isCurrent) continue;
      const latest = alerts[item.key] || "";
      if (!latest) continue;
      const existing = window.localStorage.getItem(`${storagePrefix}${item.key}`) || "";
      if (existing !== latest) {
        window.localStorage.setItem(`${storagePrefix}${item.key}`, latest);
      }
    }
  }, [alerts, items, pathname, storagePrefix]);

  const itemsWithState = useMemo(
    () =>
      items.map((item) => {
        // Defensive fallback: prevents crashes if a stale client bundle (or SW cache) renders a newer icon key.
        const Icon = iconMap[item.icon] ?? Circle;
        const label = item.labelKey ? tNav(item.labelKey) : item.label;
        const latest = alerts[item.key] || "";
        const seenToken = hydrated ? window.localStorage.getItem(`${storagePrefix}${item.key}`) || "" : "";
        const isCurrent = item.matchPrefix
          ? pathname === item.href || pathname.startsWith(item.matchPrefix)
          : pathname === item.href;
        const showDot = !!latest && latest !== seenToken && !isCurrent;
        const badgeCount = counts[item.key] ?? 0;
        return { ...item, Icon, showDot, badgeCount, label };
      }),
    [alerts, counts, hydrated, items, pathname, storagePrefix, tNav]
  );

  const firstName = useMemo(() => {
    const trimmed = displayName.trim();
    if (!trimmed) return "User";
    return trimmed.split(" ")[0] || "User";
  }, [displayName]);

  const greeting = useMemo(() => {
    if (hour === null) return tGreeting("fallback", { name: firstName });
    if (hour < 12) return tGreeting("goodMorning", { name: firstName });
    if (hour < 17) return tGreeting("goodAfternoon", { name: firstName });
    return tGreeting("goodEvening", { name: firstName });
  }, [firstName, hour, tGreeting]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between md:block">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">{greeting}</h1>
          <p className="text-xs text-foreground/60 md:text-sm">{tGreeting("welcomeBack")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact className="md:hidden" />
          <ThemeToggle className="hidden md:inline-flex" />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-foreground/15 bg-foreground/[0.04] p-2 text-foreground/90 md:hidden"
            aria-label={mobileOpen ? tShell("closeMenu") : tShell("openMenu")}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        className={`${mobileOpen ? "block" : "hidden"} space-y-5 rounded-lg border border-foreground/10 bg-foreground/[0.04] p-4 md:block md:space-y-6 md:rounded-none md:border-0 md:bg-transparent md:p-0`}
      >
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.04] p-3 md:border md:bg-foreground/[0.04]">
          <p className="text-xs text-foreground/50">{tShell("signedInAs")}</p>
          <p className="text-sm font-medium text-foreground/90">{displayName}</p>
        </div>

        <nav className="max-h-[50svh] space-y-2 overflow-y-auto pr-1 text-sm md:max-h-none md:space-y-4 md:overflow-visible md:pr-0">
          {itemsWithState.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center justify-between rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-foreground/75 transition hover:bg-foreground/[0.06] hover:text-foreground md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0"
            >
              <span className="flex items-center gap-3">
                <item.Icon size={18} />
                {item.label}
              </span>
              {item.badgeCount > 0 ? (
                <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">
                  {item.badgeCount}
                </span>
              ) : item.showDot ? (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="pt-1 md:pt-2">
          <div className="mb-3 md:hidden">
            <ThemeToggle className="w-full justify-center rounded-xl py-2 text-sm" />
          </div>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="mb-3 flex items-center gap-3 text-sm text-foreground/70 transition hover:text-foreground"
          >
            <House size={18} />
            {tShell("mainHome")}
          </Link>
          {showForgotPasswordInNav ? (
            <Link
              href="/forgot-password"
              onClick={() => setMobileOpen(false)}
              className="mb-3 flex items-center gap-3 text-sm text-foreground/70 transition hover:text-foreground"
            >
              <KeyRound size={18} />
              {tShell("forgotPassword")}
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function HomeNavLink() {
  const tShell = useTranslations("dashboard.shell");
  return (
    <Link href="/" className="mb-3 flex items-center gap-3 text-sm text-foreground/70 transition hover:text-foreground">
      <House size={18} />
      {tShell("mainHome")}
    </Link>
  );
}

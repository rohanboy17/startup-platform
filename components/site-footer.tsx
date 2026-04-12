"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import PublicSocialLinks from "@/components/public-social-links";
import { cn } from "@/lib/utils";

export default function SiteFooter({ year }: { year: number }) {
  const tFooter = useTranslations("footer");
  const tLinks = useTranslations("footer.links");
  const [mobileOpen, setMobileOpen] = useState({
    platform: false,
    compliance: false,
  });

  const toggleMobileGroup = (group: "platform" | "compliance") => {
    setMobileOpen((current) => ({
      ...current,
      [group]: !current[group],
    }));
  };

  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.025),rgba(59,130,246,0.025)_45%,rgba(15,23,42,0.015)_100%)] px-4 py-8 text-sm text-foreground/72 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_72%)]" />

      <div className="relative mx-auto w-full max-w-screen-2xl space-y-5">
        <div className="rounded-[2rem] border border-foreground/10 bg-background/84 p-5 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.16)] sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-foreground/10 bg-foreground/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-foreground">FreeEarnHub</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 sm:text-[11px]">
                    {tFooter("marketplace")}
                  </p>
                </div>
              </div>

              <div className="max-w-2xl space-y-2.5">
                <p className="text-[15px] leading-7 text-foreground/82 sm:text-lg">{tFooter("tagline")}</p>
                <p className="text-sm leading-6 text-foreground/60">{tFooter("builtFor")}</p>
              </div>

              <PublicSocialLinks
                title={tFooter("socialTitle")}
                description={tFooter("socialDescription")}
                iconOnly
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-[1.4rem] border border-foreground/10 bg-background/76 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.14)] sm:p-5">
                <button
                  type="button"
                  onClick={() => toggleMobileGroup("platform")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={mobileOpen.platform}
                >
                  <span className="text-sm font-semibold text-foreground">{tFooter("platform")}</span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-foreground/55 transition sm:hidden",
                      mobileOpen.platform ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
                <nav
                  className={cn(
                    "mt-3 text-xs text-foreground/70 sm:mt-4 sm:grid sm:gap-2 sm:text-sm",
                    mobileOpen.platform ? "grid gap-1.5" : "hidden sm:grid"
                  )}
                >
                  <Link href="/" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("home")}
                  </Link>
                  <Link href="/services" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("services")}
                  </Link>
                  <Link href="/about" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("about")}
                  </Link>
                  <Link href="/faq" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("faq")}
                  </Link>
                  <Link href="/contact" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("contact")}
                  </Link>
                  <Link href="/support" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("support")}
                  </Link>
                  <Link href="/sitemap" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("sitemap")}
                  </Link>
                </nav>
              </div>

              <div className="rounded-[1.4rem] border border-foreground/10 bg-background/76 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.14)] sm:p-5">
                <button
                  type="button"
                  onClick={() => toggleMobileGroup("compliance")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={mobileOpen.compliance}
                >
                  <span className="text-sm font-semibold text-foreground">{tFooter("compliance")}</span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-foreground/55 transition sm:hidden",
                      mobileOpen.compliance ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
                <nav
                  className={cn(
                    "mt-3 text-xs text-foreground/70 sm:mt-4 sm:grid sm:gap-2 sm:text-sm",
                    mobileOpen.compliance ? "grid gap-1.5" : "hidden sm:grid"
                  )}
                >
                  <Link href="/terms" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("terms")}
                  </Link>
                  <Link href="/privacy" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("privacy")}
                  </Link>
                  <Link href="/refund-policy" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("refund")}
                  </Link>
                  <Link href="/cookie-policy" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("cookie")}
                  </Link>
                  <Link href="/disclaimer" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("disclaimer")}
                  </Link>
                  <Link href="/kyc-policy" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("kyc")}
                  </Link>
                  <Link href="/business-guidelines" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("businessGuidelines")}
                  </Link>
                  <Link href="/compliance" className="rounded-lg px-2.5 py-2 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("compliancePage")}
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4 text-center text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            (c) {year} FreeEarnHub. {tFooter("rights")}
          </p>
          <p>{tFooter("creditLine")}</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import PublicSocialLinks from "@/components/public-social-links";

export default function SiteFooter({ year }: { year: number }) {
  const tFooter = useTranslations("footer");
  const tLinks = useTranslations("footer.links");

  return (
    <footer className="relative border-t border-foreground/10 bg-background px-4 py-8 text-sm text-foreground/70 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_70%)]" />
      <div className="mx-auto w-full max-w-screen-2xl space-y-8">
        <div className="surface-card-focus rounded-3xl p-5 sm:p-8">
          <div className="space-y-6 sm:space-y-8 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:space-y-0">
            <div className="space-y-4 text-center sm:text-left">
              <div className="flex items-center justify-center gap-3 sm:justify-start">
                <div className="h-10 w-10 rounded-2xl border border-foreground/10 bg-foreground/5 p-[3px]">
                  <div className="h-full w-full rounded-[14px] bg-gradient-to-br from-emerald-400/80 to-sky-400/70" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-foreground">FreeEarnHub</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 sm:text-[11px]">
                    {tFooter("marketplace")}
                  </p>
                </div>
              </div>
              <p className="mx-auto max-w-md text-sm text-foreground/60 sm:mx-0">{tFooter("tagline")}</p>
              <PublicSocialLinks
                title={tFooter("socialTitle")}
                description={tFooter("socialDescription")}
                iconOnly
              />
              <p className="text-xs text-foreground/50">{tFooter("creditLine")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-foreground/10 pt-5 text-center md:gap-8 md:pt-6 md:text-left lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="surface-card rounded-2xl p-4 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">{tFooter("platform")}</p>
                <nav className="grid gap-2 text-sm text-foreground/70">
                  <Link href="/" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("home")}
                  </Link>
                  <Link href="/services" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("services")}
                  </Link>
                  <Link href="/about" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("about")}
                  </Link>
                  <Link href="/faq" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("faq")}
                  </Link>
                  <Link href="/contact" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("contact")}
                  </Link>
                  <Link href="/support" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("support")}
                  </Link>
                  <Link href="/sitemap" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("sitemap")}
                  </Link>
                </nav>
              </div>

              <div className="surface-card rounded-2xl p-4 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">{tFooter("compliance")}</p>
                <nav className="grid gap-2 text-sm text-foreground/70">
                  <Link href="/terms" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("terms")}
                  </Link>
                  <Link href="/privacy" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("privacy")}
                  </Link>
                  <Link href="/refund-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("refund")}
                  </Link>
                  <Link href="/cookie-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("cookie")}
                  </Link>
                  <Link href="/disclaimer" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("disclaimer")}
                  </Link>
                  <Link href="/kyc-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("kyc")}
                  </Link>
                  <Link href="/business-guidelines" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
                    {tLinks("businessGuidelines")}
                  </Link>
                  <Link href="/compliance" className="rounded-md px-2 py-1 transition hover:bg-foreground/[0.06] hover:text-foreground">
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
          <p>{tFooter("builtFor")}</p>
        </div>
      </div>
    </footer>
  );
}



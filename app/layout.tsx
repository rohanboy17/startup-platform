import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import SiteHeader from "@/components/site-header";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "EarnHub",
  description: "Micro-task marketplace for users and businesses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EarnHub",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased selection:bg-emerald-300/30`}
      >
        <ThemeProvider>
          <PwaRegister />
          <SiteHeader />
          <div className="pt-14 sm:pt-16">{children}</div>
          <footer className="relative border-t border-foreground/10 bg-background px-4 py-8 text-sm text-foreground/70 sm:px-6 sm:py-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_70%)]" />
            <div className="mx-auto w-full max-w-screen-2xl space-y-8">
              <div className="surface-card-elevated rounded-3xl p-5 sm:p-8">
                <div className="space-y-6 sm:space-y-8 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:space-y-0">
                <div className="space-y-4 text-center sm:text-left">
                  <div className="flex items-center justify-center gap-3 sm:justify-start">
                    <div className="h-10 w-10 rounded-2xl border border-foreground/10 bg-foreground/5 p-[3px]">
                      <div className="h-full w-full rounded-[14px] bg-gradient-to-br from-emerald-400/80 to-sky-400/70" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">EarnHub</p>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 sm:text-[11px]">Marketplace</p>
                    </div>
                  </div>
                  <p className="mx-auto max-w-md text-sm text-foreground/60 sm:mx-0">
                    A secure two-sided marketplace where users complete verified tasks and businesses launch measurable growth campaigns.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-foreground/10 pt-5 text-center md:gap-8 md:pt-6 md:text-left lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
                    <p className="mb-3 text-sm font-semibold text-foreground">Platform</p>
                    <nav className="grid gap-2 text-sm text-foreground/70">
                      <Link href="/" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Home
                      </Link>
                      <Link href="/about" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        About
                      </Link>
                      <Link href="/faq" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        FAQ
                      </Link>
                      <Link href="/contact" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Contact
                      </Link>
                      <Link href="/support" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Support
                      </Link>
                      <Link href="/sitemap" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Sitemap
                      </Link>
                    </nav>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
                    <p className="mb-3 text-sm font-semibold text-foreground">Compliance</p>
                    <nav className="grid gap-2 text-sm text-foreground/70">
                      <Link href="/terms" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Terms
                      </Link>
                      <Link href="/privacy" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Privacy
                      </Link>
                      <Link href="/refund-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Refund Policy
                      </Link>
                      <Link href="/cookie-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Cookie Policy
                      </Link>
                      <Link href="/disclaimer" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        Disclaimer
                      </Link>
                      <Link href="/kyc-policy" className="rounded-md px-2 py-1 transition hover:bg-foreground/5 hover:text-foreground">
                        KYC Policy
                      </Link>
                    </nav>
                  </div>
                </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4 text-center text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <p>(c) {new Date().getFullYear()} EarnHub. All rights reserved.</p>
                <p>Built for secure payouts, moderation, and campaign analytics.</p>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}

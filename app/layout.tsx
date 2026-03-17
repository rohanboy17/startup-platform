import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PwaRegister from "@/components/pwa-register";
import PushForegroundListener from "@/components/push-foreground-listener";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreeEarnHub",
  description: "Verified task platform for users and businesses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FreeEarnHub",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value || "en";
  const locale = cookieLocale === "hi" || cookieLocale === "bn" || cookieLocale === "en" ? cookieLocale : "en";
  const messages = (await import(`../messages/${locale}.json`).then((m) => m.default).catch(async () => {
    const fallback = await import("../messages/en.json");
    return fallback.default;
  })) as Record<string, unknown>;
  const year = new Date().getFullYear();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased selection:bg-emerald-300/30`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <PwaRegister />
            <PushForegroundListener />
            <SiteHeader />
            <div className="pt-14 sm:pt-16">{children}</div>
            <SiteFooter year={year} />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}


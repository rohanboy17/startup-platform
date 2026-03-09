import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EarnHub",
  description: "Micro-task marketplace for users and businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-emerald-300/30`}
      >
        <ThemeProvider>
          {children}
          <footer className="border-t border-white/10 bg-black px-6 py-6 text-sm text-white/70">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
              <p>(c) {new Date().getFullYear()} EarnHub</p>
              <nav className="flex flex-wrap gap-4">
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
                <Link href="/refund-policy" className="hover:text-white">
                  Refund Policy
                </Link>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
                <Link href="/cookie-policy" className="hover:text-white">
                  Cookie Policy
                </Link>
                <Link href="/disclaimer" className="hover:text-white">
                  Disclaimer
                </Link>
                <Link href="/kyc-policy" className="hover:text-white">
                  KYC Policy
                </Link>
              </nav>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function OfflinePage() {
  const locale = await getLocale();
  const content =
    locale === "hi"
      ? {
          eyebrow: "ऑफलाइन मोड",
          title: "आप ऑफलाइन हैं",
          body: "Network connection उपलब्ध नहीं है। Live dashboards और campaign actions जारी रखने के लिए फिर से connect करें।",
          cta: "होम पर वापस जाएँ",
        }
      : locale === "bn"
        ? {
            eyebrow: "অফলাইন মোড",
            title: "আপনি অফলাইনে আছেন",
            body: "Network connection পাওয়া যাচ্ছে না। Live dashboards এবং campaign actions চালিয়ে যেতে আবার connect করুন।",
            cta: "হোমে ফিরুন",
          }
        : {
            eyebrow: "Offline Mode",
            title: "You are offline",
            body: "Network connection is unavailable. Reconnect to continue with live dashboards and campaign actions.",
            cta: "Return to Home",
          };

  return (
    <main className="public-shell min-h-screen px-4 py-16 text-foreground">
      <div className="mx-auto max-w-xl rounded-3xl border border-foreground/10 bg-background/70 p-8 text-center shadow-xl shadow-black/10 backdrop-blur-xl dark:bg-white/[0.03] dark:shadow-black/30">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-600/80 dark:text-emerald-300/80">{content.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{content.title}</h1>
        <p className="mt-3 text-sm text-foreground/70">{content.body}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-foreground/15 bg-foreground/[0.06] px-5 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/[0.10]"
        >
          {content.cta}
        </Link>
      </div>
    </main>
  );
}

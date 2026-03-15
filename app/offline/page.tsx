import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function OfflinePage() {
  const locale = await getLocale();
  const content =
    locale === "hi"
      ? {
          eyebrow: "ऑफ़लाइन मोड",
          title: "आप ऑफ़लाइन हैं",
          body: "नेटवर्क कनेक्शन उपलब्ध नहीं है। लाइव डैशबोर्ड और कैंपेन एक्शन जारी रखने के लिए फिर से कनेक्ट करें।",
          cta: "होम पर वापस जाएँ",
        }
      : locale === "bn"
        ? {
            eyebrow: "অফলাইন মোড",
            title: "আপনি অফলাইনে আছেন",
            body: "নেটওয়ার্ক সংযোগ পাওয়া যাচ্ছে না। লাইভ ড্যাশবোর্ড ও ক্যাম্পেইন অ্যাকশন চালিয়ে যেতে পুনরায় সংযুক্ত হন।",
            cta: "হোমে ফিরুন",
          }
        : {
            eyebrow: "Offline Mode",
            title: "You are offline",
            body: "Network connection is unavailable. Reconnect to continue with live dashboards and campaign actions.",
            cta: "Return to Home",
          };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_40%),#020617] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl shadow-black/30 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">{content.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="mt-3 text-sm text-white/70">
          {content.body}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/15"
        >
          {content.cta}
        </Link>
      </div>
    </main>
  );
}

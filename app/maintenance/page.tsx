import Link from "next/link";
import { PublicPageShell, PolicySection } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";
import { SUPPORT_EMAIL } from "@/lib/public-links";

export default async function MaintenancePage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "सिस्टम स्टेटस",
          title: "मेंटेनेंस मोड",
          description: "हम reliability और security बेहतर करने के लिए updates लागू कर रहे हैं। सेवा जल्द ही फिर शुरू होगी।",
          meaningTitle: "इसका मतलब क्या है",
          meaningBody: "इस maintenance window के दौरान कुछ dashboard और payout operations अस्थायी रूप से उपलब्ध नहीं हो सकते।",
          helpTitle: "अभी मदद चाहिए?",
          helpLead: "तत्काल payment या account issues के लिए संपर्क करें:",
          also: "आप platform policies भी देख सकते हैं:",
          andWord: "और",
          faq: "FAQ",
          refund: "रिफंड नीति",
        }
      : locale === "bn"
        ? {
            eyebrow: "সিস্টেম স্টেটাস",
            title: "মেইনটেন্যান্স মোড",
            description: "আমরা reliability এবং security উন্নত করতে updates প্রয়োগ করছি। সেবা শিগগিরই আবার চালু হবে।",
            meaningTitle: "এর মানে কী",
            meaningBody: "এই maintenance window-এ কিছু dashboard এবং payout operations সাময়িকভাবে unavailable থাকতে পারে।",
            helpTitle: "এখনই সাহায্য দরকার?",
            helpLead: "জরুরি payment বা account issues-এর জন্য যোগাযোগ করুন:",
            also: "আপনি platform policies-ও দেখতে পারেন:",
            andWord: "এবং",
            faq: "FAQ",
            refund: "রিফান্ড নীতি",
          }
        : {
            eyebrow: "System Status",
            title: "Maintenance Mode",
            description: "We are currently applying updates to improve reliability and security. Service will resume shortly.",
            meaningTitle: "What This Means",
            meaningBody: "Some dashboard and payout operations may be temporarily unavailable during this maintenance window.",
            helpTitle: "Need Help Right Now?",
            helpLead: "For urgent payment or account issues, contact support immediately at",
            also: "You can also review platform policies in the",
            andWord: "and",
            faq: "FAQ",
            refund: "Refund Policy",
          };

  return (
    <PublicPageShell eyebrow={meta.eyebrow} title={meta.title} description={meta.description} lastUpdated="April 3, 2026">
      <div className="space-y-4">
        <PolicySection title={meta.meaningTitle}>
          <p>{meta.meaningBody}</p>
        </PolicySection>
        <PolicySection title={meta.helpTitle}>
          <p>
            {meta.helpLead}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p>
            {meta.also}{" "}
            <Link href="/faq" className="underline underline-offset-4">
              {meta.faq}
            </Link>{" "}
            {meta.andWord}{" "}
            <Link href="/refund-policy" className="underline underline-offset-4">
              {meta.refund}
            </Link>
            .
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

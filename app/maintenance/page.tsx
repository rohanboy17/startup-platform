import Link from "next/link";
import { PublicPageShell, PolicySection } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function MaintenancePage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "सिस्टम स्थिति",
          title: "मेंटेनेंस मोड",
          description: "हम विश्वसनीयता और सुरक्षा सुधारने के लिए अपडेट लागू कर रहे हैं। सेवा जल्द ही फिर शुरू होगी।",
          meaningTitle: "इसका मतलब क्या है",
          meaningBody: "इस मेंटेनेंस विंडो के दौरान कुछ डैशबोर्ड और पेआउट ऑपरेशन अस्थायी रूप से उपलब्ध नहीं हो सकते।",
          helpTitle: "अभी मदद चाहिए?",
          helpLead: "तत्काल भुगतान या अकाउंट समस्या के लिए तुरंत संपर्क करें:",
          also: "आप प्लेटफ़ॉर्म नीतियाँ भी देख सकते हैं:",
          andWord: "और",
          faq: "FAQ",
          refund: "रिफंड नीति",
        }
      : locale === "bn"
        ? {
            eyebrow: "সিস্টেম স্ট্যাটাস",
            title: "মেইনটেন্যান্স মোড",
            description: "নির্ভরযোগ্যতা ও নিরাপত্তা উন্নত করতে আমরা আপডেট প্রয়োগ করছি। শীঘ্রই সার্ভিস পুনরায় চালু হবে।",
            meaningTitle: "এর মানে কী",
            meaningBody: "এই মেইনটেন্যান্স উইন্ডোতে কিছু ড্যাশবোর্ড ও পেআউট অপারেশন সাময়িকভাবে অনুপলব্ধ হতে পারে।",
            helpTitle: "এখনই সাহায্য দরকার?",
            helpLead: "জরুরি পেমেন্ট বা অ্যাকাউন্ট সমস্যার জন্য যোগাযোগ করুন:",
            also: "আপনি প্ল্যাটফর্ম নীতিগুলিও দেখতে পারেন:",
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
    <PublicPageShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
    >
      <div className="space-y-4">
        <PolicySection title={meta.meaningTitle}>
          <p>{meta.meaningBody}</p>
        </PolicySection>
        <PolicySection title={meta.helpTitle}>
          <p>
            {meta.helpLead}{" "}
            <a href="mailto:support@earnhub.in" className="underline underline-offset-4">
              support@earnhub.in
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

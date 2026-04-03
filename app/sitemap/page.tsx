import Link from "next/link";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale, getTranslations } from "next-intl/server";

export default async function SitemapPage() {
  const locale = await getLocale();
  const tHeader = await getTranslations("header");
  const tFooterLinks = await getTranslations("footer.links");

  const groupTitles =
    locale === "hi"
      ? { main: "मुख्य", legal: "कानूनी और अनुपालन", account: "अकाउंट" }
      : locale === "bn"
        ? { main: "মূল", legal: "আইনি ও কমপ্লায়েন্স", account: "অ্যাকাউন্ট" }
        : { main: "Main", legal: "Legal & Compliance", account: "Account" };

  const localizedGroups = [
    {
      title: groupTitles.main,
      links: [
        ["/", tHeader("home")],
        ["/about", tHeader("about")],
        ["/faq", tHeader("faq")],
        ["/contact", tHeader("contact")],
        ["/support", tFooterLinks("support")],
      ],
    },
    {
      title: groupTitles.legal,
      links: [
        ["/terms", tFooterLinks("terms")],
        ["/privacy", tFooterLinks("privacy")],
        ["/refund-policy", tFooterLinks("refund")],
        ["/cookie-policy", tFooterLinks("cookie")],
        ["/disclaimer", tFooterLinks("disclaimer")],
        ["/kyc-policy", tFooterLinks("kyc")],
        ["/business-guidelines", tFooterLinks("businessGuidelines")],
        ["/compliance", tFooterLinks("compliancePage")],
      ],
    },
    {
      title: groupTitles.account,
      links: [
        ["/login", tHeader("signIn")],
        ["/register", tHeader("register")],
        [
          "/forgot-password",
          locale === "hi" ? "पासवर्ड भूल गए" : locale === "bn" ? "পাসওয়ার্ড ভুলে গেছেন" : "Forgot Password",
        ],
        ["/dashboard", locale === "hi" ? "डैशबोर्ड" : locale === "bn" ? "ড্যাশবোর্ড" : "Dashboard"],
      ],
    },
  ] as const;

  return (
    <PublicPageShell
      eyebrow={locale === "hi" ? "नेविगेशन" : locale === "bn" ? "নেভিগেশন" : "Navigation"}
      title={locale === "hi" ? "साइटमैप" : locale === "bn" ? "সাইটম্যাপ" : "Sitemap"}
      description={
        locale === "hi"
          ? "FreeEarnHub प्लेटफ़ॉर्म के प्रमुख पेजों तक त्वरित पहुँच।"
          : locale === "bn"
            ? "FreeEarnHub প্ল্যাটফর্মের প্রধান পেজগুলোতে দ্রুত অ্যাক্সেস।"
            : "Quick access to the major pages across the FreeEarnHub platform."
      }
      lastUpdated="April 3, 2026"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {localizedGroups.map((group) => (
          <PolicySection key={group.title} title={group.title}>
            <ul className="space-y-2">
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-foreground/80 underline-offset-4 transition hover:text-foreground hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </PolicySection>
        ))}
      </div>
    </PublicPageShell>
  );
}

import Link from "next/link";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const groups = [
  {
    title: "Main",
    links: [
      ["/", "Home"],
      ["/about", "About"],
      ["/faq", "FAQ"],
      ["/contact", "Contact"],
      ["/support", "Support Center"],
    ],
  },
  {
    title: "Legal & Compliance",
    links: [
      ["/terms", "Terms & Conditions"],
      ["/privacy", "Privacy Policy"],
      ["/refund-policy", "Refund Policy"],
      ["/cookie-policy", "Cookie Policy"],
      ["/disclaimer", "Disclaimer"],
      ["/kyc-policy", "KYC Policy"],
    ],
  },
  {
    title: "Account",
    links: [
      ["/login", "Sign In"],
      ["/register", "Create Account"],
      ["/dashboard", "Dashboard"],
    ],
  },
] as const;

export default function SitemapPage() {
  return (
    <PublicPageShell
      eyebrow="Navigation"
      title="Sitemap"
      description="Quick access to the major pages across the EarnHub platform."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <PolicySection key={group.title} title={group.title}>
            <ul className="space-y-2">
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/80 underline-offset-4 transition hover:text-white hover:underline">
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


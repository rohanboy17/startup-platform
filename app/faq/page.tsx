import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const FALLBACK_FAQ = [
  {
    q: "What is EarnHub?",
    a: "EarnHub is a two-sided marketplace where businesses launch campaigns and users earn by completing verified tasks.",
  },
  {
    q: "When do users receive rewards?",
    a: "Rewards are credited after manager/admin approval according to the moderation workflow and campaign rules.",
  },
  {
    q: "How long do withdrawals take?",
    a: "Most withdrawal requests are processed within 3 to 5 business days, subject to fraud and compliance checks.",
  },
  {
    q: "Can businesses launch campaigns immediately?",
    a: "Business accounts may require KYC approval before campaign creation and budget deployment.",
  },
  {
    q: "Do you share personal data?",
    a: "We do not sell personal data. Data sharing is limited to essential service providers and legal/regulatory obligations.",
  },
];

export default async function FaqPage() {
  const content = await getCmsValue<{ body: string }>("legal.faq", { body: "" });
  const body = content.body?.trim();

  return (
    <PublicPageShell
      eyebrow="Help Center"
      title="Frequently Asked Questions"
      description="Quick answers about accounts, approvals, payouts, campaign workflow, and platform trust."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {body ? (
          <PolicySection title="FAQ">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          FALLBACK_FAQ.map((item) => (
            <PolicySection key={item.q} title={item.q}>
              <p>{item.a}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}

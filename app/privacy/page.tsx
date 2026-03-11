import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const FALLBACK = `We collect necessary data such as name, email, account role, task activity, IP address, and transaction metadata to operate the platform safely.

Payment operations are processed via Razorpay. We do not store raw card, UPI PIN, or other sensitive payment instrument details on our servers.

Data is used for authentication, fraud prevention, moderation, ledger integrity, and legal compliance.

We do not sell personal data. Data may be shared only with service providers or regulators when legally required.

We implement reasonable security controls such as access restrictions, audit logging, and transport encryption.`;

export default async function PrivacyPage() {
  const content = await getCmsValue<{ body: string }>("legal.privacy", { body: "" });
  const body = content.body?.trim();

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="How we collect, use, protect, and retain account and transaction data on EarnHub."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {body ? (
          <PolicySection title="Privacy Policy">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          FALLBACK.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Privacy Clause ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}

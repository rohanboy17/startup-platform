import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const FALLBACK = `By using EarnHub, you agree to these terms. EarnHub is a micro-task marketplace for users and businesses.

Platform Description
Businesses post campaigns and users submit task proofs. Admin moderation is required for approvals and payout flow.

User Responsibilities
Users must provide genuine submissions, avoid abuse, and comply with anti-fraud checks. One user may submit only within configured platform limits.

Business Responsibilities
Businesses must maintain adequate wallet balance, publish legitimate campaigns, and accept moderation decisions.

Commission Structure
EarnHub charges a 30% platform commission on approved task rewards unless a different policy is formally announced.

Submission & Fraud Policy
Fraudulent, duplicate, or manipulated proofs may be rejected. Accounts can be flagged, suspended, or permanently disabled for abuse, suspicious IP activity, or policy violation.

Refund & Disputes
Refund eligibility is governed by the Refund Policy page. Disputes are reviewed by the platform team and resolved based on platform records and moderation logs.

Liability Limitation
EarnHub is provided on a best-effort basis. We are not liable for indirect losses, third party downtime, or payment rail disruptions beyond our control.`;

export default async function TermsPage() {
  const content = await getCmsValue<{ body: string }>("legal.terms", { body: "" });
  const body = content.body?.trim();

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Terms & Conditions"
      description="These terms govern platform access, task participation, campaign publishing, and payout operations on EarnHub."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {body ? (
          <PolicySection title="Terms">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          FALLBACK.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Section ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}

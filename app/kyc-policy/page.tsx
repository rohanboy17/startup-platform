import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

export default function KycPolicyPage() {
  return (
    <PublicPageShell
      eyebrow="Compliance"
      title="KYC Policy"
      description="Know-your-customer verification rules for business access, fraud prevention, and payout safety."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        <PolicySection title="When KYC Is Required">
          <p>
            KYC may be required for business campaign operations, higher-risk payout workflows,
            suspicious activity flags, or regulatory obligations.
          </p>
        </PolicySection>

        <PolicySection title="What Information May Be Requested">
          <ul className="list-disc space-y-1 pl-5">
            <li>Legal business name and contact details</li>
            <li>Registered address and supporting documentation</li>
            <li>Tax identifiers where applicable</li>
            <li>Verification documents for authorized representatives</li>
          </ul>
        </PolicySection>

        <PolicySection title="Verification Outcomes">
          <p>
            Accounts may be approved, rejected, or asked for re-submission. Pending KYC can limit
            campaign creation or payout operations until review is complete.
          </p>
        </PolicySection>

        <PolicySection title="Data Handling">
          <p>
            KYC data is processed with strict access controls and retained only for legal, risk, and
            compliance obligations defined in our Privacy Policy.
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

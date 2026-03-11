import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@earnhub.in";

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Support Center"
      title="How Can We Help?"
      description="Get support for account access, withdrawals, campaign billing, KYC, and moderation issues."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PolicySection title="Account & Security">
          <ul className="list-disc space-y-1 pl-5">
            <li>Login and 2FA issues</li>
            <li>Suspended or restricted account support</li>
            <li>Password reset guidance</li>
          </ul>
        </PolicySection>
        <PolicySection title="Wallet, Funding & Payouts">
          <ul className="list-disc space-y-1 pl-5">
            <li>Business wallet deposits/refunds</li>
            <li>User withdrawal status and delays</li>
            <li>Ledger and transaction clarification</li>
          </ul>
        </PolicySection>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PolicySection title="Campaign & Submission Support">
          <ul className="list-disc space-y-1 pl-5">
            <li>Campaign approval and KYC checks</li>
            <li>Submission review outcomes</li>
            <li>Rejection reason clarification</li>
          </ul>
        </PolicySection>
        <PolicySection title="Contact Support">
          <p>
            Email:{" "}
            <a className="font-medium text-white underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>Response SLA: usually within 24 to 48 business hours.</p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}


import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@earnhub.in";
const SUPPORT_ADDRESS =
  process.env.NEXT_PUBLIC_SUPPORT_ADDRESS ||
  "EarnHub Support Desk, Bengaluru, Karnataka, India";

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="Contact EarnHub"
      description="For account support, payment concerns, compliance questions, or dispute escalation, contact our team."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PolicySection title="Support Email">
          <p>Primary support channel:</p>
          <p className="text-base font-semibold text-white">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>Typical first response: 24 to 48 business hours.</p>
        </PolicySection>

        <PolicySection title="Business Hours">
          <p>Monday to Saturday</p>
          <p className="font-medium text-white">10:00 AM to 7:00 PM (IST)</p>
          <p>Critical payout or security incidents are prioritized.</p>
        </PolicySection>
      </div>

      <div className="mt-4">
        <PolicySection title="Registered Support Address">
          <p>{SUPPORT_ADDRESS}</p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

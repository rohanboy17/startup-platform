import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About"
      title="About EarnHub"
      description="EarnHub is a trusted task marketplace where businesses run measurable campaigns and users earn from verified work."
    >
      <div className="space-y-4">
        <PolicySection title="What We Build">
          <p>
            We provide a two-sided system: businesses launch campaign tasks, and users submit proof
            of completion. Every submission flows through moderation before financial settlement.
          </p>
        </PolicySection>

        <PolicySection title="How Trust Is Maintained">
          <ul className="list-disc space-y-1 pl-5">
            <li>Role-based moderation (manager + admin workflow)</li>
            <li>Wallet ledger transparency for credits, debits, and payouts</li>
            <li>Fraud and abuse checks before approvals</li>
            <li>Audit-friendly review and decision history</li>
          </ul>
        </PolicySection>

        <PolicySection title="Our Product Direction">
          <p>
            EarnHub is designed as a long-term growth platform, not a one-time gig board. We focus
            on reliable payouts, clear business ROI, and operational compliance from day one.
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

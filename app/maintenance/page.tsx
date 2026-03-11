import Link from "next/link";
import { PublicPageShell, PolicySection } from "@/components/public-page-shell";

export default function MaintenancePage() {
  return (
    <PublicPageShell
      eyebrow="System Status"
      title="Maintenance Mode"
      description="We are currently applying updates to improve reliability and security. Service will resume shortly."
    >
      <div className="space-y-4">
        <PolicySection title="What This Means">
          <p>Some dashboard and payout operations may be temporarily unavailable during this maintenance window.</p>
        </PolicySection>
        <PolicySection title="Need Help Right Now?">
          <p>
            For urgent payment or account issues, contact support immediately at{" "}
            <a href="mailto:support@earnhub.in" className="underline underline-offset-4">
              support@earnhub.in
            </a>
            .
          </p>
          <p>
            You can also review platform policies in the{" "}
            <Link href="/faq" className="underline underline-offset-4">
              FAQ
            </Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="underline underline-offset-4">
              Refund Policy
            </Link>
            .
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

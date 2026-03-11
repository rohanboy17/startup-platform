import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

export default function DisclaimerPage() {
  return (
    <PublicPageShell
      eyebrow="Compliance"
      title="Disclaimer"
      description="Important limitations and operational boundaries for using the EarnHub platform."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        <PolicySection title="Service Scope">
          <p>
            EarnHub provides workflow infrastructure for campaign execution and user participation.
            We do not guarantee specific business results, earning outcomes, or uninterrupted
            availability.
          </p>
        </PolicySection>

        <PolicySection title="Third-Party Dependencies">
          <p>
            Payment providers, cloud infrastructure, telecom networks, and external APIs may affect
            availability or processing timelines beyond our direct control.
          </p>
        </PolicySection>

        <PolicySection title="Jurisdictional Responsibility">
          <p>
            Users and businesses are responsible for compliance with local laws, tax requirements,
            and digital marketing rules applicable in their region.
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

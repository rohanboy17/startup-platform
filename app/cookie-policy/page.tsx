import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

export default function CookiePolicyPage() {
  return (
    <PublicPageShell
      eyebrow="Compliance"
      title="Cookie Policy"
      description="How cookies and similar technologies are used to run secure sessions and improve platform reliability."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        <PolicySection title="Essential Cookies">
          <p>
            Essential cookies are used for sign-in sessions, auth state, account security, and
            protected routes. Disabling essential cookies may prevent access to core features.
          </p>
        </PolicySection>

        <PolicySection title="Performance and Preference Cookies">
          <p>
            We may use limited analytics and preference storage to improve product stability,
            interface quality, and workflow speed.
          </p>
        </PolicySection>

        <PolicySection title="How to Control Cookies">
          <p>
            You can manage cookies through browser controls. Blocking all cookies may degrade user
            experience and restrict key platform operations.
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

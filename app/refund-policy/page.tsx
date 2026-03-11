import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";

const FALLBACK = `Businesses may request refunds for unused campaign budget that has not been spent on approved submissions.

Once a submission is approved and reward settlement is completed, that amount is not refundable.

Withdrawals are reviewed and typically processed within 3 to 5 business days, subject to compliance and fraud checks.

For disputes, contact support with relevant transaction IDs and account details for manual review.`;

export default async function RefundPolicyPage() {
  const content = await getCmsValue<{ body: string }>("legal.refund", { body: "" });
  const body = content.body?.trim();

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Refund Policy"
      description="Refund handling for campaign balances, settlement boundaries, and withdrawal processing timelines."
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {body ? (
          <PolicySection title="Refund Rules">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          FALLBACK.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Refund Rule ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}

import { getCmsValue } from "@/lib/cms";

const FALLBACK = `Businesses may request refunds for unused campaign budget that has not been spent on approved submissions.

Once a submission is approved and reward settlement is completed, that amount is not refundable.

Withdrawals are reviewed and typically processed within 3 to 5 business days, subject to compliance and fraud checks.

For disputes, contact support with relevant transaction IDs and account details for manual review.`;

export default async function RefundPolicyPage() {
  const content = await getCmsValue<{ body: string }>("legal.refund", { body: "" });
  const body = content.body?.trim() || FALLBACK;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">Refund Policy</h1>
      <div className="space-y-4 text-white/80">
        {body.split("\n\n").map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}

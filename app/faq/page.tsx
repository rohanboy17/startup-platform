import { getCmsValue } from "@/lib/cms";

const FALLBACK = `What is EarnHub?
EarnHub is a two-sided marketplace where businesses create campaigns and users earn by completing approved tasks.

When do I receive rewards?
Rewards are credited after moderation approval and final admin verification.

How long do withdrawals take?
Withdrawal processing usually takes 3 to 5 business days.

Is my data safe?
We store only required account and activity metadata and process payments via secure providers.`;

export default async function FaqPage() {
  const content = await getCmsValue<{ body: string }>("legal.faq", { body: "" });
  const body = content.body?.trim() || FALLBACK;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">FAQ</h1>
      <div className="space-y-4 text-white/80">
        {body.split("\n\n").map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}

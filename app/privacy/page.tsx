import { getCmsValue } from "@/lib/cms";

const FALLBACK = `We collect necessary data such as name, email, account role, task activity, IP address, and transaction metadata to operate the platform safely.

Payment operations are processed via Razorpay. We do not store raw card, UPI PIN, or other sensitive payment instrument details on our servers.

Data is used for authentication, fraud prevention, moderation, ledger integrity, and legal compliance.

We do not sell personal data. Data may be shared only with service providers or regulators when legally required.

We implement reasonable security controls such as access restrictions, audit logging, and transport encryption.`;

export default async function PrivacyPage() {
  const content = await getCmsValue<{ body: string }>("legal.privacy", { body: "" });
  const body = content.body?.trim() || FALLBACK;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <div className="space-y-4 text-white/80">
        {body.split("\n\n").map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}

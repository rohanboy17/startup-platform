export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>

      <p className="mb-4 text-white/80">
        We collect necessary data such as name, email, account role, task activity, IP address,
        and transaction metadata to operate the platform safely.
      </p>

      <p className="mb-4 text-white/80">
        Payment operations are processed via Razorpay. We do not store raw card, UPI PIN, or other
        sensitive payment instrument details on our servers.
      </p>

      <p className="mb-4 text-white/80">
        Data is used for authentication, fraud prevention, moderation, ledger integrity, and legal
        compliance.
      </p>

      <p className="mb-4 text-white/80">
        We do not sell personal data. Data may be shared only with service providers or regulators
        when legally required.
      </p>

      <p className="text-white/80">
        We implement reasonable security controls such as access restrictions, audit logging, and
        transport encryption.
      </p>
    </main>
  );
}

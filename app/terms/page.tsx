export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">Terms & Conditions</h1>

      <p className="mb-4 text-white/80">
        By using EarnHub, you agree to these terms. EarnHub is a micro-task marketplace for
        users and businesses.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Platform Description</h2>
      <p className="mb-4 text-white/80">
        Businesses post campaigns and users submit task proofs. Admin moderation is required for
        approvals and payout flow.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">User Responsibilities</h2>
      <p className="mb-4 text-white/80">
        Users must provide genuine submissions, avoid abuse, and comply with anti-fraud checks.
        One user may submit only within configured platform limits.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Business Responsibilities</h2>
      <p className="mb-4 text-white/80">
        Businesses must maintain adequate wallet balance, publish legitimate campaigns, and accept
        moderation decisions.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Commission Structure</h2>
      <p className="mb-4 text-white/80">
        EarnHub charges a 30% platform commission on approved task rewards unless a different
        policy is formally announced.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Submission & Fraud Policy</h2>
      <p className="mb-4 text-white/80">
        Fraudulent, duplicate, or manipulated proofs may be rejected. Accounts can be flagged,
        suspended, or permanently disabled for abuse, suspicious IP activity, or policy violation.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Refund & Disputes</h2>
      <p className="mb-4 text-white/80">
        Refund eligibility is governed by the Refund Policy page. Disputes are reviewed by the
        platform team and resolved based on platform records and moderation logs.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Liability Limitation</h2>
      <p className="text-white/80">
        EarnHub is provided on a best-effort basis. We are not liable for indirect losses, third
        party downtime, or payment rail disruptions beyond our control.
      </p>
    </main>
  );
}

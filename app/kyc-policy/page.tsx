export default function KycPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">KYC Policy</h1>

      <p className="mb-4 text-white/80">
        To prevent fraud and comply with payment and regulatory requirements, EarnHub may request
        identity verification (KYC) for selected accounts.
      </p>

      <p className="mb-4 text-white/80">
        KYC checks may be required for high-value withdrawals, repeated suspicious activity, or
        platform risk flags. Requested documents can include government-issued identification and
        supporting account details.
      </p>

      <p className="mb-4 text-white/80">
        Failure to complete KYC when required may result in temporary withdrawal restrictions,
        payout delays, or account suspension.
      </p>

      <p className="text-white/80">
        KYC records are handled under our Privacy Policy and retained only as required by law and
        risk-control obligations.
      </p>
    </main>
  );
}

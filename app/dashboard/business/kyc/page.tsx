import BusinessKycPanel from "@/components/business-kyc-panel";

export default function BusinessKycPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Verification</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Business KYC</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Submit your business verification details for review before launching campaigns.
        </p>
      </div>
      <BusinessKycPanel />
    </div>
  );
}


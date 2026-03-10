export default async function UserHelpPage() {
  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Trust and support</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Help</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Understand how approvals, levels, fraud checks, and withdrawals work before you submit more tasks.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">Approval workflow</p>
          <h3 className="mt-2 text-xl font-semibold text-white">How your submission gets approved</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>1. You submit proof from the task detail page.</li>
            <li>2. Manager reviews first and can approve or reject.</li>
            <li>3. Admin verifies the final decision.</li>
            <li>4. Approved submissions credit your wallet automatically.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">Level system</p>
          <h3 className="mt-2 text-xl font-semibold text-white">How levels move</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>Level upgrades are based on admin-approved submissions.</li>
            <li>L1 starts immediately and higher levels unlock as approvals increase.</li>
            <li>The daily activity counter resets on the configured reset schedule.</li>
            <li>Your overview page shows current progress toward the next level.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">Fraud policy</p>
          <h3 className="mt-2 text-xl font-semibold text-white">What can get a submission rejected</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>Copied or fake proof.</li>
            <li>Submitting for a task without completing the required action.</li>
            <li>Repeated abuse from the same device or IP.</li>
            <li>Trying to bypass campaign slot or review controls.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">Withdrawals</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Payout rules</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>Normal minimum withdrawal is INR {minWithdrawal.toFixed(2)}.</li>
            <li>Emergency withdrawal is allowed below the minimum, up to 2 times per month.</li>
            <li>Only one pending withdrawal request is allowed at a time.</li>
            <li>Admin review determines approval or rejection.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
        <p className="text-sm text-white/60">Support</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Need help?</h3>
        <p className="mt-4 text-sm text-white/70">
          If something looks wrong in your submissions, wallet, or withdrawals, use the public contact page or the official support channel listed there.
        </p>
      </section>
    </div>
  );
}

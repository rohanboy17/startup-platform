import ManagerHistoryPanel from "@/components/manager-history-panel";

export default async function ManagerHistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Your moderation</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager History</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Review what you approved and rejected, with reasons and campaign context.
        </p>
      </div>
      <ManagerHistoryPanel />
    </div>
  );
}


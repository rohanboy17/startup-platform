import ManagerSubmissionQueuePanel from "@/components/manager-submission-queue-panel";

export default async function ManagerSubmissionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Moderation queue</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Submission Queue</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Review pending submissions, surface suspicious accounts, and move valid work to final admin verification.
        </p>
      </div>
      <ManagerSubmissionQueuePanel />
    </div>
  );
}

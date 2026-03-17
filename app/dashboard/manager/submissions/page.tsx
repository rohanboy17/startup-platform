import ManagerSubmissionQueuePanel from "@/components/manager-submission-queue-panel";

export default async function ManagerSubmissionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Submission review</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Review Desk</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Review new submissions, identify risky activity, and send valid work forward for final approval.
        </p>
      </div>
      <ManagerSubmissionQueuePanel />
    </div>
  );
}

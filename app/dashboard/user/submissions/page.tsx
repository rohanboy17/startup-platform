import UserV2SubmissionsPanel from "@/components/user-v2-submissions-panel";

export default async function UserSubmissionsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Submission History</h2>
      <UserV2SubmissionsPanel />
    </div>
  );
}

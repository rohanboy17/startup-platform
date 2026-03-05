import UserCampaignsPanel from "@/components/user-campaigns-panel";

export default async function TasksPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Live Campaigns</h2>
      <UserCampaignsPanel />
    </div>
  );
}

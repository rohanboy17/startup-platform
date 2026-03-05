import BusinessCampaignsPanel from "@/components/business-campaigns-panel";

export default async function CampaignsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Your Campaigns</h2>
      <BusinessCampaignsPanel />
    </div>
  );
}

import UserCampaignDetailPanel from "@/components/user-campaign-detail-panel";

export default async function UserCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  return <UserCampaignDetailPanel campaignId={campaignId} />;
}

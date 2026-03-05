import BusinessAnalyticsPanel from "@/components/business-analytics-panel";

export default async function BusinessAnalyticsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Campaign Analytics</h2>
      <BusinessAnalyticsPanel />
    </div>
  );
}

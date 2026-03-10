import BusinessAnalyticsPanel from "@/components/business-analytics-panel";

export default async function BusinessAnalyticsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold md:text-3xl">Campaign Analytics</h2>
      <BusinessAnalyticsPanel />
    </div>
  );
}

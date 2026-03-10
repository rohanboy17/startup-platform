import ManagerRiskPanel from "@/components/manager-risk-panel";

export default async function ManagerRiskPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Fraud signals</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Risk</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Triage suspicious activity quickly: flagged users, IP hotspots, and pending-admin backlog.
        </p>
      </div>
      <ManagerRiskPanel />
    </div>
  );
}


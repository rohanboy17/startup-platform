import { prisma } from "@/lib/prisma";
import AdminCompliancePanel from "@/components/admin-compliance-panel";

export default async function AdminCompliancePage() {
  const evidence = await prisma.legalEvidence.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Audit & Compliance</h2>
      <AdminCompliancePanel
        initialEvidence={evidence.map((e) => ({
          id: e.id,
          entityType: e.entityType,
          entityId: e.entityId,
          note: e.note,
          fileUrl: e.fileUrl,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

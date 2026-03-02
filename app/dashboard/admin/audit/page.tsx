import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminAuditPage() {
  const delegate = (prisma as unknown as {
    auditLog?: {
      findMany: (args: {
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          actorUserId: string | null;
          actorRole: string | null;
          targetUserId: string | null;
          action: string;
          details: string | null;
          createdAt: Date;
        }>
      >;
    };
  }).auditLog;

  let logs: Array<{
    id: string;
    actorUserId: string | null;
    actorRole: string | null;
    targetUserId: string | null;
    action: string;
    details: string | null;
    createdAt: Date;
  }> = [];
  let loadError = "";

  if (delegate) {
    try {
      logs = await delegate.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    } catch (error: unknown) {
      loadError = error instanceof Error ? error.message : "Failed to load audit logs";
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Audit Logs</h2>

      {!delegate ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">
            Audit log table is not available yet. Run migrations and restart the server.
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">{loadError}</CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">No moderation logs yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-1 p-5">
                <p className="font-medium">{log.action}</p>
                <p className="text-sm text-white/70">
                  Actor: {log.actorRole || "SYSTEM"} {log.actorUserId ? `(${log.actorUserId})` : ""}
                </p>
                {log.targetUserId ? (
                  <p className="text-sm text-white/70">Target User: {log.targetUserId}</p>
                ) : null}
                {log.details ? <p className="text-sm text-white/60">{log.details}</p> : null}
                <p className="text-xs text-white/50">{new Date(log.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

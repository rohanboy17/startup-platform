import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

type SearchParams = {
  q?: string;
  action?: string;
  actorRole?: string;
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const action = params.action?.trim() || "";
  const actorRole = params.actorRole?.trim() || "ALL";

  const delegate = (prisma as unknown as {
    auditLog?: {
      findMany: (args: {
        where?: {
          action?: { contains: string; mode: "insensitive" };
          actorRole?: string;
          OR?: Array<
            | { details: { contains: string; mode: "insensitive" } }
            | { action: { contains: string; mode: "insensitive" } }
            | { targetUserId: { contains: string; mode: "insensitive" } }
            | { actorUserId: { contains: string; mode: "insensitive" } }
          >;
        };
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
        where: {
          ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
          ...(actorRole !== "ALL" ? { actorRole } : {}),
          ...(q
            ? {
                OR: [
                  { details: { contains: q, mode: "insensitive" } },
                  { action: { contains: q, mode: "insensitive" } },
                  { targetUserId: { contains: q, mode: "insensitive" } },
                  { actorUserId: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });
    } catch (error: unknown) {
      loadError = error instanceof Error ? error.message : "Failed to load audit logs";
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Audit Logs</h2>

      <Card className="rounded-2xl border-white/10 bg-white/5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search details, actor, target"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              name="action"
              defaultValue={action}
              placeholder="Action contains (optional)"
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              name="actorRole"
              defaultValue={actorRole}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">All Actor Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="BUSINESS">BUSINESS</option>
              <option value="USER">USER</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                Apply Filters
              </button>
              <a
                href="/dashboard/admin/audit"
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Clear
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

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

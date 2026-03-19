import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

type SearchParams = {
  q?: string;
  action?: string;
  actorRole?: string;
  limit?: string;
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
  const limit =
    params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;

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
          ipAddress: string | null;
          beforeState: unknown | null;
          afterState: unknown | null;
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
    ipAddress: string | null;
    beforeState: unknown | null;
    afterState: unknown | null;
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
        ...(limit ? { take: limit } : { take: 1000 }),
      });
    } catch (error: unknown) {
      loadError = error instanceof Error ? error.message : "Failed to load audit logs";
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">Admin Activity Log</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review who changed what, when it happened, and which account or record was affected.
        </p>
      </div>

      <Card className="rounded-2xl border-foreground/10 bg-background/60">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-5">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search notes, actor, or target"
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            />
            <input
              type="text"
              name="action"
              defaultValue={action}
              placeholder="Filter by action"
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            />
            <select
              name="actorRole"
              defaultValue={actorRole}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All actor roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="BUSINESS">BUSINESS</option>
              <option value="USER">USER</option>
            </select>
            <select
              name="limit"
              defaultValue={limit ? String(limit) : "ALL"}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">Show 5</option>
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="ALL">Show all</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.10]"
              >
                Apply
              </button>
              <a
                href="/dashboard/admin/audit"
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.06]"
              >
                Reset
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {!delegate ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">
            Audit history is not available yet. Run the latest database migrations and restart the app.
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">{loadError}</CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="rounded-2xl border-foreground/10 bg-background/60">
          <CardContent className="p-6 text-sm text-foreground/70">No admin activity has been recorded yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="rounded-2xl border-foreground/10 bg-background/60">
              <CardContent className="space-y-1 p-5">
                <p className="font-medium">{log.action}</p>
                <p className="text-sm text-foreground/70">
                  Done by: {log.actorRole || "SYSTEM"} {log.actorUserId ? `(${log.actorUserId})` : ""}
                </p>
                {log.targetUserId ? (
                  <p className="text-sm text-foreground/70">Affected account: {log.targetUserId}</p>
                ) : null}
                {log.details ? <p className="text-sm text-foreground/65">{log.details}</p> : null}
                {log.ipAddress ? <p className="text-xs text-foreground/55">IP address: {log.ipAddress}</p> : null}
                {log.beforeState ? (
                  <pre className="max-h-40 overflow-auto rounded-md border border-foreground/10 bg-background/60 p-2 text-xs text-foreground/65">
                    Before change: {JSON.stringify(log.beforeState)}
                  </pre>
                ) : null}
                {log.afterState ? (
                  <pre className="max-h-40 overflow-auto rounded-md border border-foreground/10 bg-background/60 p-2 text-xs text-foreground/65">
                    After change: {JSON.stringify(log.afterState)}
                  </pre>
                ) : null}
                <p className="text-xs text-foreground/55">{new Date(log.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminUserFlagActions from "@/components/admin-user-flag-actions";

export default async function AdminUsersPage() {
  let users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "BUSINESS" | "ADMIN";
    balance: number;
    ipAddress: string | null;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    flaggedAt: Date | null;
    createdAt: Date;
  }> = [];
  let loadError = "";

  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        ipAddress: true,
        isSuspicious: true,
        suspiciousReason: true,
        flaggedAt: true,
        createdAt: true,
      },
    });
  } catch (error: unknown) {
    loadError = error instanceof Error ? error.message : "Failed to load users";
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Users</h2>

      {loadError ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-semibold">{user.name || "Unnamed User"}</h3>
                <p className="text-sm text-white/70">{user.email}</p>
                <p className="text-sm">Role: {user.role}</p>
                <p className="text-sm">Balance: INR {user.balance}</p>
                <p className="text-sm text-white/60">Last IP: {user.ipAddress || "unknown"}</p>
                <p
                  className={`text-sm ${
                    user.isSuspicious ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  {user.isSuspicious ? "Suspicious: FLAGGED" : "Suspicious: Clear"}
                </p>
                {user.suspiciousReason ? (
                  <p className="text-xs text-white/60">Reason: {user.suspiciousReason}</p>
                ) : null}
                {user.flaggedAt ? (
                  <p className="text-xs text-white/50">
                    Flagged: {new Date(user.flaggedAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="text-xs text-white/50">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>

                {user.role !== "ADMIN" ? (
                  <AdminUserFlagActions userId={user.id} isSuspicious={user.isSuspicious} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

  if (!delegate) {
    return NextResponse.json(
      { error: "Audit log unavailable. Run migrations and restart server." },
      { status: 503 }
    );
  }

  try {
    const logs = await delegate.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

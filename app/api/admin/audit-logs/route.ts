import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";
  const actorRole = searchParams.get("actorRole")?.trim() || "ALL";

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

  if (!delegate) {
    return NextResponse.json(
      { error: "Audit log unavailable. Run migrations and restart server." },
      { status: 503 }
    );
  }

  try {
    const logs = await delegate.findMany({
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

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

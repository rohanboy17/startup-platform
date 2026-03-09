import { prisma } from "@/lib/prisma";

type EventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export async function createSecurityEvent(input: {
  kind: string;
  severity?: EventSeverity;
  message: string;
  ipAddress?: string | null;
  userId?: string | null;
  metadata?: unknown;
}) {
  const payload =
    input.metadata === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(input.metadata)) as object);

  await prisma.securityEvent.create({
    data: {
      kind: input.kind,
      severity: input.severity ?? "LOW",
      message: input.message,
      ipAddress: input.ipAddress ?? null,
      userId: input.userId ?? null,
      metadata: payload,
    },
  });
}

function notExpiredClause() {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

export async function checkIpAccess(params: { ip: string; adminOnly?: boolean }) {
  if (!params.ip || params.ip === "unknown") {
    return { blocked: false as const, reason: "unknown-ip" };
  }

  const block = await prisma.ipAccessRule.findFirst({
    where: {
      ip: params.ip,
      type: "BLOCK",
      isActive: true,
      ...notExpiredClause(),
    },
    select: { id: true, note: true },
  });

  if (block) {
    return { blocked: true as const, reason: block.note || "Blocked IP" };
  }

  if (params.adminOnly) {
    const allowListEnabled = await prisma.ipAccessRule.count({
      where: {
        type: "ALLOW",
        isActive: true,
        ...notExpiredClause(),
      },
    });

    if (allowListEnabled > 0) {
      const allowed = await prisma.ipAccessRule.findFirst({
        where: {
          ip: params.ip,
          type: "ALLOW",
          isActive: true,
          ...notExpiredClause(),
        },
        select: { id: true },
      });

      if (!allowed) {
        return { blocked: true as const, reason: "Admin IP allowlist restriction" };
      }
    }
  }

  return { blocked: false as const, reason: "allowed" };
}

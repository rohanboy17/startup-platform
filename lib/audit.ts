import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  action: string;
  details?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  const delegate = (prisma as unknown as {
    auditLog?: {
      create: (args: {
        data: {
          actorUserId?: string | null;
          actorRole?: string | null;
          targetUserId?: string | null;
          action: string;
          details?: string | null;
        };
      }) => Promise<unknown>;
    };
  }).auditLog;

  if (!delegate) {
    return;
  }

  try {
    await delegate.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        details: input.details ?? null,
      },
    });
  } catch {
    // Non-blocking: audit logging should not break primary workflow.
  }
}

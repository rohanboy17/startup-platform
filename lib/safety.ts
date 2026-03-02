import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function autoFlagSuspiciousUser(params: {
  userId: string;
  reason: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, isSuspicious: true, suspiciousReason: true },
  });

  if (!user) {
    return;
  }

  if (user.isSuspicious && user.suspiciousReason?.includes(params.reason)) {
    return;
  }

  const combinedReason = user.suspiciousReason
    ? `${user.suspiciousReason}; ${params.reason}`
    : params.reason;

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      isSuspicious: true,
      suspiciousReason: combinedReason.slice(0, 500),
      flaggedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorRole: "SYSTEM",
    targetUserId: params.userId,
    action: "AUTO_FLAG_USER",
    details: params.reason,
  });
}

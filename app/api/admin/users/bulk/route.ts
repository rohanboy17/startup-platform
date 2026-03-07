import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
type Role = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
type BulkAction = "SET_STATUS" | "SET_ROLE" | "FLAG" | "UNFLAG";

export async function PATCH(req: Request) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-user-bulk:${ip}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    userIds?: string[];
    action?: BulkAction;
    status?: AccountStatus;
    role?: Role;
    reason?: string;
  };

  const userIds = Array.from(new Set((body.userIds || []).map((id) => id.trim()).filter(Boolean)));
  const action = body.action;
  const reason = body.reason?.trim() || null;

  if (userIds.length === 0) {
    return NextResponse.json({ error: "No users selected" }, { status: 400 });
  }
  if (userIds.length > 100) {
    return NextResponse.json({ error: "Select up to 100 users per batch" }, { status: 400 });
  }
  if (!action || !["SET_STATUS", "SET_ROLE", "FLAG", "UNFLAG"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "SET_STATUS") {
    if (!body.status || !["ACTIVE", "SUSPENDED", "BANNED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if ((body.status === "SUSPENDED" || body.status === "BANNED") && !reason) {
      return NextResponse.json(
        { error: "Reason is required for suspend or ban" },
        { status: 400 }
      );
    }
  }

  if (action === "SET_ROLE") {
    if (!body.role || !["USER", "BUSINESS", "MANAGER", "ADMIN"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      role: true,
      accountStatus: true,
      isSuspicious: true,
    },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "No matching users found" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let updated = 0;
    let skipped = 0;
    const skippedUsers: string[] = [];

    for (const user of users) {
      if (user.id === session.user.id) {
        skipped += 1;
        skippedUsers.push(`${user.email} (self)`);
        continue;
      }

      if (action === "SET_STATUS") {
        const status = body.status as AccountStatus;

        if (user.role === "ADMIN" && status !== "ACTIVE") {
          skipped += 1;
          skippedUsers.push(`${user.email} (admin-protected)`);
          continue;
        }

        if (user.accountStatus === status) {
          skipped += 1;
          skippedUsers.push(`${user.email} (already ${status})`);
          continue;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            accountStatus: status,
            statusReason: reason,
            statusUpdatedAt: new Date(),
          },
        });

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ADMIN_BULK_USER_STATUS_CHANGED",
            entity: "User",
            details: `target=${user.email}, status=${status}, reason=${reason || "-"}`,
          },
        });

        updated += 1;
        continue;
      }

      if (action === "SET_ROLE") {
        const role = body.role as Role;

        if (user.role === role) {
          skipped += 1;
          skippedUsers.push(`${user.email} (already ${role})`);
          continue;
        }

        if (user.role === "ADMIN" && role !== "ADMIN") {
          skipped += 1;
          skippedUsers.push(`${user.email} (admin-protected)`);
          continue;
        }

        await tx.user.update({
          where: { id: user.id },
          data: { role },
        });

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ADMIN_BULK_USER_ROLE_CHANGED",
            entity: "User",
            details: `target=${user.email}, role=${role}`,
          },
        });

        updated += 1;
        continue;
      }

      if (action === "FLAG") {
        if (user.role === "ADMIN") {
          skipped += 1;
          skippedUsers.push(`${user.email} (admin-protected)`);
          continue;
        }
        if (user.isSuspicious) {
          skipped += 1;
          skippedUsers.push(`${user.email} (already flagged)`);
          continue;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            isSuspicious: true,
            suspiciousReason: reason || "Flagged by admin bulk action",
            flaggedAt: new Date(),
          },
        });

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ADMIN_BULK_USER_FLAGGED",
            entity: "User",
            details: `target=${user.email}, reason=${reason || "-"}`,
          },
        });

        updated += 1;
        continue;
      }

      if (action === "UNFLAG") {
        if (!user.isSuspicious) {
          skipped += 1;
          skippedUsers.push(`${user.email} (already clear)`);
          continue;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            isSuspicious: false,
            suspiciousReason: null,
            flaggedAt: null,
          },
        });

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ADMIN_BULK_USER_UNFLAGGED",
            entity: "User",
            details: `target=${user.email}, reason=${reason || "-"}`,
          },
        });

        updated += 1;
      }
    }

    return { updated, skipped, skippedUsers };
  });

  return NextResponse.json({
    message: "Bulk moderation completed",
    ...result,
  });
}

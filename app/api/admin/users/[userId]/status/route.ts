import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-user-status:${ip}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const { status, reason } = (await req.json()) as {
    status?: AccountStatus;
    reason?: string;
  };

  if (!status || !["ACTIVE", "SUSPENDED", "BANNED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const trimmedReason = reason?.trim() || "";
  if ((status === "SUSPENDED" || status === "BANNED") && !trimmedReason) {
    return NextResponse.json(
      { error: "Reason is required for suspend or ban" },
      { status: 400 }
    );
  }

  if (session.user.id === userId && status !== "ACTIVE") {
    return NextResponse.json(
      { error: "You cannot suspend/ban your own account" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountStatus: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "ADMIN" && status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Admin accounts cannot be suspended or banned" },
      { status: 400 }
    );
  }

  if (user.accountStatus === status) {
    return NextResponse.json({ message: "Status already set" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: status,
      statusReason: trimmedReason || null,
      statusUpdatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      statusReason: true,
      statusUpdatedAt: true,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: "USER_STATUS_CHANGED",
    details: `email=${user.email}, from=${user.accountStatus}, to=${status}, reason=${trimmedReason || "-"}`,
  });

  return NextResponse.json({
    message: "Account status updated",
    user: updated,
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { eventId } = await params;
  const body = (await req.json()) as { status?: "OPEN" | "RESOLVED" | "DISMISSED" };

  if (!body.status || !["OPEN", "RESOLVED", "DISMISSED"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const event = await prisma.securityEvent.update({
    where: { id: eventId },
    data: {
      status: body.status,
      resolvedAt: body.status === "OPEN" ? null : new Date(),
      resolvedByUserId: body.status === "OPEN" ? null : session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_SECURITY_EVENT_STATUS",
      details: `eventId=${event.id}, status=${event.status}`,
    },
  });

  return NextResponse.json({ message: "Security event updated", event });
}

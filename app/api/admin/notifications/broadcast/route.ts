import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplateMessage, sendInAppNotification } from "@/lib/notify";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    segment?: "ALL" | "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
    title?: string;
    message?: string;
    templateKey?: string;
  };

  const segment = body.segment || "ALL";
  const title = body.title?.trim() || "";
  const message = body.message?.trim() || "";

  if (!body.templateKey && (!title || !message)) {
    return NextResponse.json({ error: "title and message are required when templateKey is not provided" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: {
      ...(segment !== "ALL" ? { role: segment } : {}),
      accountStatus: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true },
    take: 10000,
  });

  let sent = 0;
  for (const user of users) {
    let finalTitle = title;
    let finalMessage = message;

    if (body.templateKey) {
      const rendered = await renderTemplateMessage({
        key: body.templateKey,
        fallbackTitle: title || "Platform update",
        fallbackBody: message || "You have a new update",
      });
      finalTitle = rendered.title;
      finalMessage = rendered.message;
    }

    const result = await sendInAppNotification({
      userId: user.id,
      title: finalTitle,
      message: finalMessage,
      type: "INFO",
      templateKey: body.templateKey,
      payload: { segment },
    });

    if (result.ok) sent += 1;
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_BROADCAST_NOTIFICATION",
      details: `segment=${segment}, recipients=${users.length}, sent=${sent}`,
      afterState: { segment, recipients: users.length, sent, templateKey: body.templateKey || null },
    },
  });

  return NextResponse.json({ message: "Broadcast completed", recipients: users.length, sent });
}

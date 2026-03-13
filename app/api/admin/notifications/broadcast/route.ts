import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplateMessage, sendNotificationChannels } from "@/lib/notify";
import type { DeliveryChannel } from "@prisma/client";

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
    channels?: Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">;
  };

  const segment = body.segment || "ALL";
  const title = body.title?.trim() || "";
  const message = body.message?.trim() || "";

  if (!body.templateKey && (!title || !message)) {
    return NextResponse.json({ error: "title and message are required when templateKey is not provided" }, { status: 400 });
  }

  const channels: DeliveryChannel[] =
    Array.isArray(body.channels) && body.channels.length > 0 ? body.channels : ["IN_APP"];

  const users = await prisma.user.findMany({
    where: {
      ...(segment !== "ALL" ? { role: segment } : {}),
      accountStatus: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true, email: true, mobile: true, telegramChatId: true },
    take: 10000,
  });

  let sent = 0;
  let fullySkipped = 0;
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

    const results = await sendNotificationChannels({
      user,
      channels,
      title: finalTitle,
      message: finalMessage,
      type: "INFO",
      templateKey: body.templateKey,
      payload: { segment, channels },
      pushData: {
        segment,
        templateKey: body.templateKey || "",
        link: "/dashboard",
      },
    });

    if (results.some((result) => result.ok)) {
      sent += 1;
    } else if (results.every((result) => result.status === "SKIPPED")) {
      fullySkipped += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_BROADCAST_NOTIFICATION",
      details: `segment=${segment}, recipients=${users.length}, sent=${sent}, skipped=${fullySkipped}, channels=${channels.join(",")}`,
      afterState: { segment, recipients: users.length, sent, skipped: fullySkipped, templateKey: body.templateKey || null, channels },
    },
  });

  return NextResponse.json({ message: "Broadcast completed", recipients: users.length, sent, skipped: fullySkipped });
}

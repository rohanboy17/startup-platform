import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotificationChannels } from "@/lib/notify";
import type { DeliveryChannel } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    message?: string;
    link?: string;
    isActive?: boolean;
    channels?: Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">;
    segment?: "ALL" | "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
  };
  const title = body.title?.trim() || "";
  const message = body.message?.trim() || "";
  if (!title || !message) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 });
  }

  const channels: DeliveryChannel[] =
    Array.isArray(body.channels) && body.channels.length > 0 ? body.channels : ["IN_APP"];
  const segment = body.segment || "ALL";

  const item = await prisma.announcement.create({
    data: {
      title,
      message,
      link: body.link?.trim() || null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
  });

  const recipients =
    channels.length > 0
      ? await prisma.user.findMany({
          where: {
            ...(segment !== "ALL" ? { role: segment } : {}),
            accountStatus: "ACTIVE",
            deletedAt: null,
          },
          select: { id: true, email: true, mobile: true, telegramChatId: true },
          take: 10000,
        })
      : [];

  if (recipients.length > 0) {
    const deliveryMessage = body.link?.trim()
      ? `${message}\n\nOpen: ${body.link.trim()}`
      : message;

    for (const user of recipients) {
      await sendNotificationChannels({
        user,
        channels,
        title,
        message: deliveryMessage,
        type: "INFO",
        templateKey: "announcement.broadcast",
        payload: { announcementId: item.id, segment, channels },
        pushData: {
          link: body.link?.trim() || "/",
          announcementId: item.id,
        },
      });
    }
  }

  return NextResponse.json({ message: "Announcement created", item });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    title?: string;
    message?: string;
    link?: string;
    isActive?: boolean;
  };
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const item = await prisma.announcement.update({
    where: { id },
    data: {
      title: body.title?.trim(),
      message: body.message?.trim(),
      link: body.link === undefined ? undefined : body.link.trim() || null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });
  return NextResponse.json({ message: "Announcement updated", item });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ message: "Announcement deleted" });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      updateMany: (args: {
        where: { userId: string; isRead?: boolean; id?: string };
        data: { isRead: boolean };
      }) => Promise<{ count: number }>;
      count: (args: { where: { userId: string; isRead: boolean } }) => Promise<number>;
    };
  }).notification;

  if (!notificationDelegate) {
    return NextResponse.json(
      { error: "Notification system unavailable. Restart the server." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    notificationId?: string;
    all?: boolean;
  };

  if (!body.all && !body.notificationId) {
    return NextResponse.json({ error: "notificationId or all is required" }, { status: 400 });
  }

  const where = body.all
    ? { userId: session.user.id, isRead: false as const }
    : { userId: session.user.id, id: body.notificationId };

  const updated = await notificationDelegate.updateMany({
    where,
    data: { isRead: true },
  });

  const unreadCount = await notificationDelegate.count({
    where: { userId: session.user.id, isRead: false },
  });

  return NextResponse.json({
    message: "Notifications updated",
    updated: updated.count,
    unreadCount,
  });
}

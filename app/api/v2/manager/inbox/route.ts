import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          title: string;
          message: string;
          createdAt: Date;
          isRead: boolean;
          type: string;
        }>
      >;
      count: (args: { where: { userId: string; isRead?: boolean } }) => Promise<number>;
    };
  }).notification;

  if (!notificationDelegate) {
    return NextResponse.json(
      { error: "Notification system unavailable. Restart the server." },
      { status: 503 }
    );
  }

  const [notifications, unreadCount] = await Promise.all([
    notificationDelegate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    notificationDelegate.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const typeCounts = notifications.reduce(
    (acc, item) => {
      if (item.type === "SUCCESS") acc.success += 1;
      else if (item.type === "WARNING") acc.warning += 1;
      else acc.info += 1;
      return acc;
    },
    { success: 0, warning: 0, info: 0 }
  );

  return NextResponse.json({
    unreadCount,
    totalCount: notifications.length,
    typeCounts,
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt.toISOString(),
      isRead: item.isRead,
      type: item.type,
    })),
  });
}


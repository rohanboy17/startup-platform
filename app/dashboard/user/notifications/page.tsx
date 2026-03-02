import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import UserNotificationsList from "@/components/user-notifications-list";

export default async function UserNotificationsPage() {
  const session = await auth();

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
      }) => Promise<
        Array<{
          id: string;
          title: string;
          message: string;
          createdAt: Date;
          isRead: boolean;
        }>
      >;
    };
  }).notification;

  const notifications = notificationDelegate
    ? await notificationDelegate.findMany({
        where: { userId: session!.user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Notifications</h2>

      {!notificationDelegate ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">
            Notification system is initializing. Please restart the dev server.
          </CardContent>
        </Card>
      ) : (
        <UserNotificationsList
          notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdAt: n.createdAt.toISOString(),
            isRead: n.isRead,
          }))}
        />
      )}
    </div>
  );
}

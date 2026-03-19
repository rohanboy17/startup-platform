import { prisma } from "@/lib/prisma";
import AdminNotificationCenter from "@/components/admin-notification-center";
import { auth } from "@/lib/auth";

type SearchParams = {
  limit?: string;
  logStatus?: "ALL" | "SENT" | "FAILED" | "SKIPPED";
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const limit =
    params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const logStatus = ["ALL", "SENT", "FAILED", "SKIPPED"].includes(params.logStatus || "")
    ? (params.logStatus as "ALL" | "SENT" | "FAILED" | "SKIPPED")
    : "ALL";
  const session = await auth();
  if (!session?.user?.id) return null;

  await Promise.all([
    prisma.notificationTemplate.upsert({
      where: { key: "submission.admin_approved" },
      update: {},
      create: {
        key: "submission.admin_approved",
        name: "Submission Approved (Admin)",
        body: "Final approval complete. INR {{netReward}} credited to your wallet.",
      },
    }),
    prisma.notificationTemplate.upsert({
      where: { key: "submission.admin_rejected" },
      update: {},
      create: {
        key: "submission.admin_rejected",
        name: "Submission Rejected (Admin)",
        body: "Your submission did not pass final admin review.",
      },
    }),
    prisma.notificationTemplate.upsert({
      where: { key: "withdrawal.approved" },
      update: {},
      create: {
        key: "withdrawal.approved",
        name: "Withdrawal Approved",
        body: "Your withdrawal of INR {{amount}} was approved. Payout INR {{payoutAmount}}, fee INR {{feeAmount}}.",
      },
    }),
    prisma.notificationTemplate.upsert({
      where: { key: "withdrawal.rejected" },
      update: {},
      create: {
        key: "withdrawal.rejected",
        name: "Withdrawal Rejected",
        body: "Your withdrawal request of INR {{amount}} was rejected.{{note}}",
      },
    }),
  ]);

  const [templates, notifications, logs] = await Promise.all([
    prisma.notificationTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.notificationDeliveryLog.findMany({
      where: logStatus === "ALL" ? undefined : { status: logStatus },
      include: { user: { select: { email: true, role: true, mobile: true } } },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Notifications Control</h2>
      <AdminNotificationCenter
        templates={templates.map((t) => ({ ...t, subject: t.subject }))}
        notifications={notifications.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          isRead: item.isRead,
          type: item.type,
          createdAt: item.createdAt.toISOString(),
        }))}
        totalCount={notifications.length}
        typeCounts={typeCounts}
        selectedLimit={limit ? String(limit) : "ALL"}
        selectedLogStatus={logStatus}
        logs={logs.map((l) => ({
          id: l.id,
          status: l.status,
          channel: l.channel,
          templateKey: l.templateKey,
          error: l.error,
          createdAtLabel: new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Calcutta",
          }).format(l.createdAt),
          user: { email: l.user.email, role: l.user.role, mobile: l.user.mobile },
        }))}
      />
    </div>
  );
}

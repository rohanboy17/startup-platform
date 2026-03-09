import { prisma } from "@/lib/prisma";
import AdminNotificationCenter from "@/components/admin-notification-center";

export default async function AdminNotificationsPage() {
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

  const [templates, logs] = await Promise.all([
    prisma.notificationTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.notificationDeliveryLog.findMany({
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Notifications Control</h2>
      <AdminNotificationCenter
        templates={templates.map((t) => ({ ...t, subject: t.subject }))}
        logs={logs.map((l) => ({
          id: l.id,
          status: l.status,
          channel: l.channel,
          templateKey: l.templateKey,
          error: l.error,
          createdAt: l.createdAt.toISOString(),
          user: { email: l.user.email, role: l.user.role },
        }))}
      />
    </div>
  );
}

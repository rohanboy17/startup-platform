import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_DATABASE_URL is required");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const strict = hasFlag("--strict");
  const legacy = prisma;
  const taskDelegate = legacy.task;

  if (!taskDelegate) {
    const report = {
      summary: {
        hasLegacyData: false,
        safeToDropLegacyTaskSchema: true,
        note: "Task model is not present in current Prisma schema/client.",
      },
      generatedAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const [
    totalTasks,
    pendingTasks,
    activeTasks,
    completedTasks,
    rejectedTasks,
    submissionsWithTaskId,
    submissionsWithCampaignId,
    submissionsWithoutFlow,
    submissionsWithBoth,
    newestLegacySubmission,
    newestLegacyTask,
  ] = await Promise.all([
    taskDelegate.count(),
    taskDelegate.count({ where: { status: "PENDING" } }),
    taskDelegate.count({ where: { status: "ACTIVE" } }),
    taskDelegate.count({ where: { status: "COMPLETED" } }),
    taskDelegate.count({ where: { status: "REJECTED" } }),
    prisma.submission.count({ where: { taskId: { not: null } } }),
    prisma.submission.count({ where: { campaignId: { not: null } } }),
    prisma.submission.count({
      where: { taskId: null, campaignId: null },
    }),
    prisma.submission.count({
      where: { taskId: { not: null }, campaignId: { not: null } },
    }),
    prisma.submission.findFirst({
      where: { taskId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, taskId: true, createdAt: true, userId: true },
    }),
    taskDelegate.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, createdAt: true, businessId: true },
    }),
  ]);

  const hasLegacyData = totalTasks > 0 || submissionsWithTaskId > 0;

  const report = {
    summary: {
      hasLegacyData,
      safeToDropLegacyTaskSchema: !hasLegacyData,
    },
    taskModel: {
      total: totalTasks,
      byStatus: {
        PENDING: pendingTasks,
        ACTIVE: activeTasks,
        COMPLETED: completedTasks,
        REJECTED: rejectedTasks,
      },
      newestTask: newestLegacyTask,
    },
    submissionFlow: {
      withTaskId: submissionsWithTaskId,
      withCampaignId: submissionsWithCampaignId,
      withBothTaskAndCampaign: submissionsWithBoth,
      withNeitherTaskNorCampaign: submissionsWithoutFlow,
      newestTaskBasedSubmission: newestLegacySubmission,
    },
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));

  if (strict && hasLegacyData) {
    console.error(
      "\n[legacy-preflight] Legacy Task data still exists. Do NOT drop Task/taskId schema yet."
    );
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error("[legacy-preflight] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

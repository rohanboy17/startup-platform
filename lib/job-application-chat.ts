import { Prisma } from "@prisma/client";

export const JOB_APPLICATION_CHAT_OPEN_STATUSES = new Set(["HIRED", "JOINED"]);
export const JOB_APPLICATION_CHAT_MAX_LENGTH = 2000;
export const JOB_APPLICATION_CHAT_REFRESH_MS = 8000;

export function isJobApplicationChatOpen(status: string) {
  return JOB_APPLICATION_CHAT_OPEN_STATUSES.has(status);
}

export function normalizeJobApplicationChatMessage(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+\n/g, "\n").slice(0, JOB_APPLICATION_CHAT_MAX_LENGTH);
}

export const jobApplicationChatMessageSelect = Prisma.validator<Prisma.JobApplicationMessageFindManyArgs>()({
  orderBy: { createdAt: "asc" },
  take: 100,
  select: {
    id: true,
    message: true,
    createdAt: true,
    senderRole: true,
    senderUser: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
});

export type JobApplicationChatMessageRecord = Prisma.JobApplicationMessageGetPayload<
  typeof jobApplicationChatMessageSelect
>;

export function serializeJobApplicationChatMessage(message: JobApplicationChatMessageRecord) {
  return {
    id: message.id,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
    senderRole: message.senderRole,
    senderUserId: message.senderUser.id,
    senderName: message.senderUser.name || message.senderUser.email || null,
  };
}

export function truncateJobChatPreview(message: string, max = 96) {
  if (message.length <= max) return message;
  return `${message.slice(0, max - 1)}...`;
}

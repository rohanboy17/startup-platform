import { Prisma } from "@prisma/client";
export { isJobApplicationChatOpen } from "@/lib/job-application-chat-access";

export const JOB_APPLICATION_CHAT_MAX_LENGTH = 2000;
export const JOB_APPLICATION_CHAT_REFRESH_MS = 8000;

export function normalizeJobApplicationChatMessage(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+\n/g, "\n").slice(0, JOB_APPLICATION_CHAT_MAX_LENGTH);
}

const CONTACT_PATTERNS = [
  { reason: "PHONE", pattern: /\b(?:\+?\d[\d\s().-]{7,}\d)\b/u },
  { reason: "EMAIL", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu },
  { reason: "URL", pattern: /\b(?:https?:\/\/|www\.)\S+\b/iu },
  { reason: "EXTERNAL_APP", pattern: /\b(?:wa\.me|whatsapp|telegram|t\.me|signal|discord)\b/iu },
  { reason: "HANDLE", pattern: /\b[a-z0-9.\-_]{2,}@[a-z]{2,}\b/iu },
  { reason: "UPI", pattern: /\b[a-z0-9.\-_]{2,}-(?:okaxis|oksbi|okicici|okhdfcbank|ybl|ibl|paytm|axl)\b/iu },
];

export function getRestrictedContactReasons(message: string) {
  return CONTACT_PATTERNS.filter(({ pattern }) => pattern.test(message)).map(({ reason }) => reason);
}

export function containsRestrictedContactDetails(message: string) {
  return getRestrictedContactReasons(message).length > 0;
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
    senderName: message.senderUser.name || null,
  };
}

export function truncateJobChatPreview(message: string, max = 96) {
  if (message.length <= max) return message;
  return `${message.slice(0, max - 1)}...`;
}

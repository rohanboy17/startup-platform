const JOB_APPLICATION_CHAT_BLOCKED_STATUSES = new Set(["REJECTED", "WITHDRAWN"]);

export function isJobApplicationChatOpen(
  status: string | null | undefined,
  adminStatus: string | null | undefined
) {
  if (adminStatus !== "ADMIN_APPROVED") return false;
  if (!status) return false;
  return !JOB_APPLICATION_CHAT_BLOCKED_STATUSES.has(status);
}

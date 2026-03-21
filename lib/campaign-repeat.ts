export function getIndiaDateKey(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(input);
}

export function getCampaignRepeatAccess(input: {
  submissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
  repeatAccessMode:
    | "OPEN"
    | "REQUESTED_ONLY"
    | "REQUESTED_PLUS_NEW"
    | "FRESH_CAMPAIGN_ONLY"
    | "FRESH_PLATFORM_ONLY";
  userSubmissionCount: number;
  userPlatformSubmissionCount: number;
  repeatRequestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}) {
  if (input.submissionMode === "ONE_PER_USER") {
    return {
      blockedByRepeatRule: false,
      canRequestTomorrow: false,
      reason: null as string | null,
    };
  }

  const hasSubmittedBefore = input.userSubmissionCount > 0;
  const hasSubmittedOnPlatform = input.userPlatformSubmissionCount > 0;
  const isApprovedRequester = input.repeatRequestStatus === "APPROVED";
  const isPendingRequester = input.repeatRequestStatus === "PENDING";

  if (input.repeatAccessMode === "OPEN") {
    return {
      blockedByRepeatRule: false,
      canRequestTomorrow: hasSubmittedBefore && !isPendingRequester,
      reason: null as string | null,
    };
  }

  if (input.repeatAccessMode === "REQUESTED_ONLY") {
    if (isApprovedRequester) {
      return {
        blockedByRepeatRule: false,
        canRequestTomorrow: hasSubmittedBefore && !isPendingRequester,
        reason: null as string | null,
      };
    }

    if (hasSubmittedBefore) {
      return {
        blockedByRepeatRule: true,
        canRequestTomorrow: !isPendingRequester,
        reason: "repeat_request_required",
      };
    }

    return {
      blockedByRepeatRule: true,
      canRequestTomorrow: false,
      reason: "requested_users_only",
    };
  }

  if (input.repeatAccessMode === "FRESH_CAMPAIGN_ONLY") {
    return {
      blockedByRepeatRule: hasSubmittedBefore,
      canRequestTomorrow: false,
      reason: hasSubmittedBefore ? ("fresh_same_campaign_only" as const) : null,
    };
  }

  if (input.repeatAccessMode === "FRESH_PLATFORM_ONLY") {
    return {
      blockedByRepeatRule: hasSubmittedOnPlatform,
      canRequestTomorrow: false,
      reason: hasSubmittedOnPlatform ? ("fresh_platform_only" as const) : null,
    };
  }

  if (isApprovedRequester) {
    return {
      blockedByRepeatRule: false,
      canRequestTomorrow: hasSubmittedBefore && !isPendingRequester,
      reason: null as string | null,
    };
  }

  if (hasSubmittedBefore) {
    return {
      blockedByRepeatRule: true,
      canRequestTomorrow: !isPendingRequester,
      reason: "repeat_request_required",
    };
  }

  return {
    blockedByRepeatRule: false,
    canRequestTomorrow: false,
    reason: null as string | null,
  };
}

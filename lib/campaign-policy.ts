type CampaignPolicyInput = {
  title: string;
  description: string;
  category: string;
  taskCategory: string;
  taskType: string;
  customTask?: string | null;
  taskLink?: string | null;
  instructions?: string[];
};

const BLOCKED_EXACT_LABELS = new Set([
  "social media like",
  "follow / subscribe",
  "share / retweet",
  "comment / engagement",
  "post promotion",
  "youtube watch / like",
  "app install",
  "website visit",
  "ad click / traffic",
  "google review",
  "play store review",
  "trustpilot review",
  "affiliate promotion",
  "influencer promotion",
  "bulk promotion campaign",
  "bulk review campaign",
  "bulk social tasks",
  "telegram / whatsapp promotion",
]);

type PolicyRule = {
  reason: string;
  saferExamples: string[];
  matches: (value: string) => boolean;
};

const POLICY_RULES: PolicyRule[] = [
  {
    reason:
      "Public review, rating, and testimonial posting campaigns are disabled for launch-safe operations.",
    saferExamples: [
      "Google Business Profile QA",
      "App listing QA",
      "Reputation analysis",
    ],
    matches: (value) =>
      /\bgoogle\s+review(s)?\b/i.test(value) ||
      /\bplay\s*store\s+review(s)?\b/i.test(value) ||
      /\btrustpilot(\s+review)?\b/i.test(value) ||
      /\b(5\s*star|five[- ]star)\b/i.test(value) ||
      /\bleave\b.{0,40}\breview\b/i.test(value) ||
      /\brate\b.{0,30}\b(app|listing|business|page)\b/i.test(value),
  },
  {
    reason:
      "Traffic and ad-click campaigns are disabled because the platform is launching as a verified operations marketplace, not a traffic exchange.",
    saferExamples: [
      "Landing Page UX Test",
      "Website Journey Test",
      "Conversion Flow QA",
    ],
    matches: (value) =>
      /\bad\s*click(s)?\b/i.test(value) ||
      /\bclick\b.{0,20}\bad\b/i.test(value) ||
      /\bboost\b.{0,20}\btraffic\b/i.test(value) ||
      /\btraffic\b.{0,20}\bboost\b/i.test(value) ||
      /\btraffic exchange\b/i.test(value),
  },
  {
    reason:
      "Follower, like, subscribe, share, and fake engagement campaigns are disabled for launch-safe operations.",
    saferExamples: [
      "Content Appeal Feedback",
      "Campaign Message Clarity Test",
      "Community Moderation",
    ],
    matches: (value) =>
      /\blike\b.{0,20}\b(post|page|video|reel|channel)\b/i.test(value) ||
      /\bfollow\b.{0,25}\b(page|account|channel|profile)\b/i.test(value) ||
      /\bsubscribe\b.{0,25}\b(channel|page)\b/i.test(value) ||
      /\bshare\b.{0,25}\b(post|link|video|reel)\b/i.test(value) ||
      /\bretweet\b/i.test(value) ||
      /\bcomment\b.{0,25}\b(post|reel|video|listing)\b/i.test(value) ||
      /\bengagement boost\b/i.test(value),
  },
  {
    reason:
      "Install-count campaigns are disabled unless the work is explicitly framed as testing, onboarding QA, beta feedback, or usability review.",
    saferExamples: [
      "App Onboarding Test",
      "Beta Testing",
      "Usability Feedback",
    ],
    matches: (value) =>
      /\bapp install\b/i.test(value) &&
      !/\b(test|testing|beta|onboarding|qa|usability|feedback)\b/i.test(value),
  },
  {
    reason:
      "Visit-for-count campaigns are disabled unless the work is clearly defined as QA, audit, or usability testing.",
    saferExamples: [
      "Website Journey Test",
      "Landing Page UX Test",
      "Screenshot-Based Listing Audit",
    ],
    matches: (value) =>
      /\bwebsite visit\b/i.test(value) &&
      !/\b(test|testing|audit|qa|journey|usability|feedback)\b/i.test(value),
  },
];

function collectPolicyText(input: CampaignPolicyInput) {
  return [
    input.title,
    input.description,
    input.category,
    input.taskCategory,
    input.taskType,
    input.customTask ?? "",
    input.taskLink ?? "",
    ...(input.instructions ?? []),
  ]
    .join("\n")
    .trim();
}

export function validateCampaignPolicy(input: CampaignPolicyInput) {
  const taskType = input.taskType.trim().toLowerCase();
  const taskCategory = input.taskCategory.trim().toLowerCase();
  const customTask = input.customTask?.trim().toLowerCase() ?? "";
  const haystack = collectPolicyText(input);

  if (
    BLOCKED_EXACT_LABELS.has(taskType) ||
    BLOCKED_EXACT_LABELS.has(taskCategory) ||
    (customTask && BLOCKED_EXACT_LABELS.has(customTask))
  ) {
    return {
      error:
        "This campaign type is not allowed in the launch-safe marketplace. Use QA, feedback, content, research, moderation, or operational micro-work instead.",
      saferExamples: [
        "Google Business Profile QA",
        "Landing Page UX Test",
        "Manual Research Task",
      ],
    };
  }

  for (const rule of POLICY_RULES) {
    if (!rule.matches(haystack)) continue;
    return {
      error: `${rule.reason} Try a safer service definition such as: ${rule.saferExamples.join(", ")}.`,
      saferExamples: rule.saferExamples,
    };
  }

  return null;
}

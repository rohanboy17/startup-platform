import { getMetricsDayKey } from "@/lib/fake-metrics";

export type FakeLiveFeedItemType = "withdrawal" | "earning" | "signup" | "campaign";

export type FakeLiveFeedItem = {
  id: string;
  type: FakeLiveFeedItemType;
  text: string;
  createdAt: number;
};

const names = [
  "Rohan",
  "Amit",
  "Priya",
  "Sneha",
  "Arjun",
  "Riya",
  "Vikash",
  "Anjali",
  "Sourav",
  "Neha",
  "Kunal",
  "Pooja",
  "Rahul",
  "Sanjay",
];

const cities = ["Kolkata", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune"];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getSeededIndex(seed: string, length: number) {
  if (length <= 0) return 0;
  return hashString(seed) % length;
}

function getRandom<T>(items: readonly T[], seed: string) {
  return items[getSeededIndex(seed, items.length)];
}

function getAmount(min: number, max: number, seed: string) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + (hashString(seed) % (upper - lower + 1));
}

function anonymize(name: string) {
  return `${name.charAt(0)}****`;
}

function createItem(
  type: FakeLiveFeedItemType,
  text: string,
  createdAt: number
): FakeLiveFeedItem {
  return {
    id: `${type}:${createdAt}:${text}`,
    type,
    text,
    createdAt,
  };
}

function buildCandidate(type: FakeLiveFeedItemType, createdAt: number) {
  const seedBase = `${type}:${createdAt}`;
  const name = anonymize(getRandom(names, `${seedBase}:name`));
  const city = getRandom(cities, `${seedBase}:city`);

  if (type === "withdrawal") {
    return createItem(
      type,
      `${name} from ${city} withdrew INR ${getAmount(100, 1000, `${seedBase}:amount`)}`,
      createdAt
    );
  }

  if (type === "earning") {
    return createItem(
      type,
      `${name} earned INR ${getAmount(10, 200, `${seedBase}:amount`)} from a verified task`,
      createdAt
    );
  }

  if (type === "signup") {
    return createItem(type, `${name} from ${city} joined FreeEarnHub`, createdAt);
  }

  return createItem(type, `A new campaign launched in ${city}`, createdAt);
}

export function generateActivityItem(options?: {
  createdAt?: number;
  recentTexts?: string[];
  preferredType?: FakeLiveFeedItemType;
  dayKey?: string;
  sequence?: number;
}) {
  const dayKey = options?.dayKey ?? getMetricsDayKey();
  const sequence = options?.sequence ?? 0;
  const createdAt = options?.createdAt ?? Date.now();
  const recentTexts = new Set(options?.recentTexts ?? []);
  const orderedTypes: FakeLiveFeedItemType[] = ["withdrawal", "earning", "signup", "campaign"];
  const types: FakeLiveFeedItemType[] = options?.preferredType
    ? [options.preferredType, ...orderedTypes.filter((item) => item !== options.preferredType)]
    : orderedTypes;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const type =
      attempt === 0 && options?.preferredType
        ? options.preferredType
        : types[getSeededIndex(`${dayKey}:${sequence}:${attempt}:type`, types.length)];
    const next = buildCandidate(type, createdAt - attempt - hashString(`${dayKey}:${sequence}:${attempt}:offset`) % 11);
    if (!recentTexts.has(next.text)) {
      return next;
    }
  }

  return buildCandidate(options?.preferredType ?? "earning", createdAt);
}

export function generateInitialFeed(count = 15, now = Date.now(), dayKey = getMetricsDayKey()) {
  const items: FakeLiveFeedItem[] = [];
  const recentTexts: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const createdAt =
      now -
      index * (9000 + (hashString(`${dayKey}:gap:${index}`) % 19001));
    const item = generateActivityItem({
      createdAt,
      recentTexts,
      preferredType: index < 3 ? "withdrawal" : undefined,
      dayKey,
      sequence: index,
    });
    items.push(item);
    recentTexts.unshift(item.text);
    if (recentTexts.length > 6) recentTexts.pop();
  }

  return items.sort((left, right) => right.createdAt - left.createdAt);
}

export function formatRelativeTime(createdAt: number, now = Date.now()) {
  const diffSeconds = Math.max(1, Math.floor((now - createdAt) / 1000));
  if (diffSeconds < 60) return `${diffSeconds} sec ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

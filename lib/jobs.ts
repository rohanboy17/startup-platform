import { parseProfileDetails } from "@/lib/user-profile";

function normalizeText(input: unknown, max = 120) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

export function normalizeStringArray(input: unknown, maxItems = 12, maxLength = 48) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of input) {
    const normalized = normalizeText(item, maxLength);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(normalized);
    if (values.length >= maxItems) break;
  }
  return values;
}

export function normalizePincode(input: unknown) {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "").slice(0, 10);
  return digits || null;
}

export function normalizeCoordinate(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function normalizeRadiusKm(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) {
    const rounded = Math.round(input);
    return rounded > 0 ? rounded : null;
  }
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Math.round(Number(trimmed));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function normalizeJobDate(input: unknown) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "__INVALID__";
  return date;
}

export function normalizeOptionalText(input: unknown, max = 120) {
  return normalizeText(input, max) || null;
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeJobSkills(input: unknown) {
  return normalizeStringArray(input, 12, 48);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(pointB.latitude - pointA.latitude);
  const lonDelta = toRadians(pointB.longitude - pointA.longitude);
  const latA = toRadians(pointA.latitude);
  const latB = toRadians(pointB.latitude);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 10) / 10;
}

export function getUserJobMatch(input: {
  userProfile: unknown;
  userSkills: string[];
  requiredSkills: string[];
  requiredLanguages: string[];
  city: string;
  state: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hiringRadiusKm?: number | null;
  workMode: "WORK_FROM_OFFICE" | "WORK_IN_FIELD" | "HYBRID";
}) {
  const profile = parseProfileDetails(input.userProfile);
  let score = 0;
  const reasons: string[] = [];

  const userSkills = new Set(input.userSkills.map((item) => item.trim().toLowerCase()).filter(Boolean));
  const matchedSkills = input.requiredSkills.filter((item) => userSkills.has(item.trim().toLowerCase()));
  if (matchedSkills.length > 0) {
    score += Math.min(4, matchedSkills.length * 2);
    reasons.push(`${matchedSkills.length} skill match`);
  }

  const matchedLanguages = input.requiredLanguages.filter((item) =>
    profile.languages.some((lang) => lang.toLowerCase() === item.trim().toLowerCase())
  );
  if (matchedLanguages.length > 0) {
    score += Math.min(2, matchedLanguages.length);
    reasons.push(`${matchedLanguages.length} language match`);
  }

  if (profile.workMode) {
    if (input.workMode === "HYBRID") {
      if (profile.workMode === "WORK_FROM_OFFICE" || profile.workMode === "WORK_IN_FIELD") {
        score += 1;
        reasons.push("work mode match");
      }
    } else if (profile.workMode === input.workMode) {
      score += 2;
      reasons.push("work mode match");
    }
  }

  if (profile.city && profile.city.toLowerCase() === input.city.toLowerCase()) {
    score += 3;
    reasons.push("same city");
  }

  if (profile.state && profile.state.toLowerCase() === input.state.toLowerCase()) {
    score += 1;
    reasons.push("same state");
  }

  if (profile.pincode && input.pincode && profile.pincode === input.pincode) {
    score += 3;
    reasons.push("same pincode");
  }

  let distanceKm: number | null = null;
  if (
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number" &&
    typeof input.latitude === "number" &&
    typeof input.longitude === "number"
  ) {
    distanceKm = getDistanceKm(
      { latitude: profile.latitude, longitude: profile.longitude },
      { latitude: input.latitude, longitude: input.longitude }
    );

    if (input.hiringRadiusKm && distanceKm <= input.hiringRadiusKm) {
      score += 3;
      reasons.push(`within ${input.hiringRadiusKm} km radius`);
    } else if (!input.hiringRadiusKm && distanceKm <= 10) {
      score += 2;
      reasons.push("nearby");
    }
  }

  return {
    score,
    reasons,
    matchedSkills,
    matchedLanguages,
    distanceKm,
  };
}

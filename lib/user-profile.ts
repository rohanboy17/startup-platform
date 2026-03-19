export type UserProfileDetails = {
  address: string | null;
  gender: string | null;
  religion: string | null;
  dateOfBirth: string | null;
  workMode: string | null;
  educationQualification: string | null;
  courseAndCertificate: string | null;
  workTime: string | null;
  workingPreference: string | null;
  languages: string[];
};

export const EMPTY_PROFILE_DETAILS: UserProfileDetails = {
  address: null,
  gender: null,
  religion: null,
  dateOfBirth: null,
  workMode: null,
  educationQualification: null,
  courseAndCertificate: null,
  workTime: null,
  workingPreference: null,
  languages: [],
};

function normalizeText(input: unknown, max = 120) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

function normalizeDate(input: unknown) {
  const value = normalizeText(input, 32);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeStringArray(input: unknown, maxItems = 10, maxLength = 40) {
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

export function parseProfileDetails(input: unknown): UserProfileDetails {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...EMPTY_PROFILE_DETAILS };
  }

  const source = input as Record<string, unknown>;
  return {
    address: normalizeText(source.address, 240) || null,
    gender: normalizeText(source.gender, 48) || null,
    religion: normalizeText(source.religion, 80) || null,
    dateOfBirth: normalizeDate(source.dateOfBirth) || null,
    workMode: normalizeText(source.workMode, 48) || null,
    educationQualification: normalizeText(source.educationQualification, 120) || null,
    courseAndCertificate: normalizeText(source.courseAndCertificate, 240) || null,
    workTime: normalizeText(source.workTime, 48) || null,
    workingPreference: normalizeText(source.workingPreference, 64) || null,
    languages: normalizeStringArray(source.languages, 10, 40),
  };
}

export function calculateAgeFromDate(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

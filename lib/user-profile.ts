export type UserProfileDetails = {
  avatarUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  gender: string | null;
  religion: string | null;
  dateOfBirth: string | null;
  workMode: string | null;
  educationQualification: string | null;
  courseAndCertificate: string | null;
  workTime: string | null;
  workingPreference: string | null;
  internshipPreference: string | null;
  languages: string[];
};

export const EMPTY_PROFILE_DETAILS: UserProfileDetails = {
  avatarUrl: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  latitude: null,
  longitude: null,
  gender: null,
  religion: null,
  dateOfBirth: null,
  workMode: null,
  educationQualification: null,
  courseAndCertificate: null,
  workTime: null,
  workingPreference: null,
  internshipPreference: null,
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

function normalizeCoordinate(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
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
    avatarUrl: normalizeText(source.avatarUrl, 240) || null,
    address: normalizeText(source.address, 240) || null,
    city: normalizeText(source.city, 80) || null,
    state: normalizeText(source.state, 80) || null,
    pincode: normalizeText(source.pincode, 16) || null,
    latitude: normalizeCoordinate(source.latitude),
    longitude: normalizeCoordinate(source.longitude),
    gender: normalizeText(source.gender, 48) || null,
    religion: normalizeText(source.religion, 80) || null,
    dateOfBirth: normalizeDate(source.dateOfBirth) || null,
    workMode: normalizeText(source.workMode, 48) || null,
    educationQualification: normalizeText(source.educationQualification, 120) || null,
    courseAndCertificate: normalizeText(source.courseAndCertificate, 240) || null,
    workTime: normalizeText(source.workTime, 48) || null,
    workingPreference: normalizeText(source.workingPreference, 64) || null,
    internshipPreference: normalizeText(source.internshipPreference, 64) || null,
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

export type ProfileCompletionSource = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gender?: string | null;
  religion?: string | null;
  dateOfBirth?: string | null;
  workMode?: string | null;
  educationQualification?: string | null;
  courseAndCertificate?: string | null;
  workTime?: string | null;
  workingPreference?: string | null;
  internshipPreference?: string | null;
  languages?: string[];
};

export type ProfileCompletionItem = {
  key:
    | "name"
    | "address"
    | "city"
    | "state"
    | "gender"
    | "religion"
    | "dateOfBirth"
    | "skills"
    | "workMode"
    | "educationQualification"
    | "courseAndCertificate"
    | "workTime"
    | "workingPreference"
    | "internshipPreference"
    | "languages";
  complete: boolean;
};

function hasValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().length > 0 : false;
}

export function getUserProfileCompletion(profile: ProfileCompletionSource, skills: string[]) {
  const items: ProfileCompletionItem[] = [
    { key: "name", complete: hasValue(profile.name) },
    { key: "address", complete: hasValue(profile.address) },
    { key: "city", complete: hasValue(profile.city) },
    { key: "state", complete: hasValue(profile.state) },
    { key: "gender", complete: hasValue(profile.gender) },
    { key: "religion", complete: hasValue(profile.religion) },
    { key: "dateOfBirth", complete: hasValue(profile.dateOfBirth) },
    { key: "skills", complete: skills.length > 0 },
    { key: "workMode", complete: hasValue(profile.workMode) },
    { key: "educationQualification", complete: hasValue(profile.educationQualification) },
    { key: "courseAndCertificate", complete: hasValue(profile.courseAndCertificate) },
    { key: "workTime", complete: hasValue(profile.workTime) },
    { key: "workingPreference", complete: hasValue(profile.workingPreference) },
    { key: "internshipPreference", complete: hasValue(profile.internshipPreference) },
    { key: "languages", complete: Array.isArray(profile.languages) && profile.languages.length > 0 },
  ];

  const completed = items.filter((item) => item.complete).length;
  const percentage = Math.round((completed / items.length) * 100);

  return {
    percentage,
    completed,
    total: items.length,
    items,
    missing: items.filter((item) => !item.complete).map((item) => item.key),
    isComplete: completed === items.length,
  };
}

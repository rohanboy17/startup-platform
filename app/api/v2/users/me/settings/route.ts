import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserProfileDetails = {
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

const EMPTY_PROFILE_DETAILS: UserProfileDetails = {
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

const ALLOWED_GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
const ALLOWED_WORK_MODES = ["WORK_FROM_HOME", "WORK_FROM_OFFICE", "WORK_IN_FIELD"] as const;
const ALLOWED_WORK_TIMES = ["FULL_TIME", "PART_TIME"] as const;
const ALLOWED_WORKING_PREFERENCES = ["SALARIED", "FREELANCE_CONTRACTUAL", "DAY_BASIS"] as const;

function normalizeMobile(input: unknown) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[\s()-]/g, "").replace(/^00/, "+");
  return normalized.length < 7 ? null : normalized;
}

function normalizeText(input: unknown, max = 120) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

function normalizeOption<T extends readonly string[]>(input: unknown, allowed: T) {
  const value = normalizeText(input, 48);
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? value : "__INVALID__";
}

function normalizeDate(input: unknown) {
  const value = normalizeText(input, 32);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "__INVALID__";
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

function parseProfileDetails(input: unknown): UserProfileDetails {
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
      timezone: true,
      profileDetails: true,
      defaultUpiId: true,
      defaultUpiName: true,
      monthlyEmergencyWithdrawCount: true,
      emergencyWithdrawMonthKey: true,
      managerQueueSort: true,
      managerRiskOnly: true,
      managerAutoNext: true,
      managerProofMode: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const emergencyUsed = user.emergencyWithdrawMonthKey === currentMonthKey ? user.monthlyEmergencyWithdrawCount : 0;
  const profileDetails = parseProfileDetails(user.profileDetails);

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      timezone: user.timezone,
      address: profileDetails.address,
      gender: profileDetails.gender,
      religion: profileDetails.religion,
      dateOfBirth: profileDetails.dateOfBirth,
      workMode: profileDetails.workMode,
      educationQualification: profileDetails.educationQualification,
      courseAndCertificate: profileDetails.courseAndCertificate,
      workTime: profileDetails.workTime,
      workingPreference: profileDetails.workingPreference,
      languages: profileDetails.languages,
    },
    withdrawals: {
      defaultUpiId: user.defaultUpiId,
      defaultUpiName: user.defaultUpiName,
      emergencyUsed,
      emergencyRemaining: Math.max(0, 2 - emergencyUsed),
      monthKey: currentMonthKey,
    },
    manager: user.role === "MANAGER"
      ? {
          queueSort: user.managerQueueSort,
          riskOnly: user.managerRiskOnly,
          autoNext: user.managerAutoNext,
          proofMode: user.managerProofMode,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        profile?: {
          name?: unknown;
          mobile?: unknown;
          timezone?: unknown;
          address?: unknown;
          gender?: unknown;
          religion?: unknown;
          dateOfBirth?: unknown;
          workMode?: unknown;
          educationQualification?: unknown;
          courseAndCertificate?: unknown;
          workTime?: unknown;
          workingPreference?: unknown;
          languages?: unknown;
        };
        withdrawals?: { defaultUpiId?: unknown; defaultUpiName?: unknown };
        manager?: { queueSort?: unknown; riskOnly?: unknown; autoNext?: unknown; proofMode?: unknown; timezone?: unknown };
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const shouldUpdateProfileDetails =
    session.user.role === "USER" &&
    Boolean(
      body.profile &&
        [
          "address",
          "gender",
          "religion",
          "dateOfBirth",
          "workMode",
          "educationQualification",
          "courseAndCertificate",
          "workTime",
          "workingPreference",
          "languages",
        ].some((key) => typeof (body.profile as Record<string, unknown>)[key] !== "undefined")
    );

  let nextProfileDetails = { ...EMPTY_PROFILE_DETAILS };

  if (body.profile) {
    if (typeof body.profile.name !== "undefined") {
      const name = normalizeText(body.profile.name, 80);
      updates.name = name || null;
    }

    if (typeof body.profile.mobile !== "undefined") {
      const mobile = normalizeMobile(body.profile.mobile);
      if (body.profile.mobile && !mobile) {
        return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
      }
      // Allow clearing.
      updates.mobile = mobile;
    }

    if (typeof body.profile.timezone !== "undefined") {
      // Only managers can change timezone for now.
      if (session.user.role === "MANAGER") {
        const tz = normalizeText(body.profile.timezone, 64);
        updates.timezone = tz || "Asia/Calcutta";
      }
    }
  }

  if (shouldUpdateProfileDetails) {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileDetails: true },
    });
    nextProfileDetails = parseProfileDetails(existingUser?.profileDetails);

    if (typeof body.profile?.address !== "undefined") {
      nextProfileDetails.address = normalizeText(body.profile.address, 240) || null;
    }
    if (typeof body.profile?.gender !== "undefined") {
      const value = normalizeOption(body.profile.gender, ALLOWED_GENDERS);
      if (value === "__INVALID__") {
        return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
      }
      nextProfileDetails.gender = value;
    }
    if (typeof body.profile?.religion !== "undefined") {
      nextProfileDetails.religion = normalizeText(body.profile.religion, 80) || null;
    }
    if (typeof body.profile?.dateOfBirth !== "undefined") {
      const value = normalizeDate(body.profile.dateOfBirth);
      if (value === "__INVALID__") {
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      }
      nextProfileDetails.dateOfBirth = value;
    }
    if (typeof body.profile?.workMode !== "undefined") {
      const value = normalizeOption(body.profile.workMode, ALLOWED_WORK_MODES);
      if (value === "__INVALID__") {
        return NextResponse.json({ error: "Invalid work mode" }, { status: 400 });
      }
      nextProfileDetails.workMode = value;
    }
    if (typeof body.profile?.educationQualification !== "undefined") {
      nextProfileDetails.educationQualification =
        normalizeText(body.profile.educationQualification, 120) || null;
    }
    if (typeof body.profile?.courseAndCertificate !== "undefined") {
      nextProfileDetails.courseAndCertificate =
        normalizeText(body.profile.courseAndCertificate, 240) || null;
    }
    if (typeof body.profile?.workTime !== "undefined") {
      const value = normalizeOption(body.profile.workTime, ALLOWED_WORK_TIMES);
      if (value === "__INVALID__") {
        return NextResponse.json({ error: "Invalid work time" }, { status: 400 });
      }
      nextProfileDetails.workTime = value;
    }
    if (typeof body.profile?.workingPreference !== "undefined") {
      const value = normalizeOption(body.profile.workingPreference, ALLOWED_WORKING_PREFERENCES);
      if (value === "__INVALID__") {
        return NextResponse.json({ error: "Invalid working preference" }, { status: 400 });
      }
      nextProfileDetails.workingPreference = value;
    }
    if (typeof body.profile?.languages !== "undefined") {
      nextProfileDetails.languages = normalizeStringArray(body.profile.languages, 10, 40);
    }

    updates.profileDetails = nextProfileDetails;
  }

  if (body.withdrawals && session.user.role === "USER") {
    if (typeof body.withdrawals.defaultUpiId !== "undefined") {
      const upi = normalizeText(body.withdrawals.defaultUpiId, 120);
      updates.defaultUpiId = upi || null;
    }
    if (typeof body.withdrawals.defaultUpiName !== "undefined") {
      const upiName = normalizeText(body.withdrawals.defaultUpiName, 120);
      updates.defaultUpiName = upiName || null;
    }
  }

  if (body.manager && session.user.role === "MANAGER") {
    if (typeof body.manager.queueSort !== "undefined") {
      const v = normalizeText(body.manager.queueSort, 16);
      if (v && v !== "NEWEST" && v !== "OLDEST") {
        return NextResponse.json({ error: "Invalid queue sort" }, { status: 400 });
      }
      if (v) updates.managerQueueSort = v;
    }
    if (typeof body.manager.riskOnly !== "undefined") {
      updates.managerRiskOnly = Boolean(body.manager.riskOnly);
    }
    if (typeof body.manager.autoNext !== "undefined") {
      updates.managerAutoNext = Boolean(body.manager.autoNext);
    }
    if (typeof body.manager.proofMode !== "undefined") {
      const v = normalizeText(body.manager.proofMode, 16);
      if (v && v !== "COMPACT" && v !== "EXPANDED") {
        return NextResponse.json({ error: "Invalid proof mode" }, { status: 400 });
      }
      if (v) updates.managerProofMode = v;
    }
    if (typeof body.manager.timezone !== "undefined") {
      const tz = normalizeText(body.manager.timezone, 64);
      updates.timezone = tz || "Asia/Calcutta";
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
      select: {
        name: true,
        email: true,
        mobile: true,
        role: true,
        createdAt: true,
        timezone: true,
        profileDetails: true,
        defaultUpiId: true,
        defaultUpiName: true,
        managerQueueSort: true,
        managerRiskOnly: true,
        managerAutoNext: true,
        managerProofMode: true,
        monthlyEmergencyWithdrawCount: true,
        emergencyWithdrawMonthKey: true,
      },
    });

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const emergencyUsed =
      updated.emergencyWithdrawMonthKey === currentMonthKey ? updated.monthlyEmergencyWithdrawCount : 0;
    const profileDetails = parseProfileDetails(updated.profileDetails);

    return NextResponse.json({
      message: "Settings updated",
      profile: {
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        timezone: updated.timezone,
        address: profileDetails.address,
        gender: profileDetails.gender,
        religion: profileDetails.religion,
        dateOfBirth: profileDetails.dateOfBirth,
        workMode: profileDetails.workMode,
        educationQualification: profileDetails.educationQualification,
        courseAndCertificate: profileDetails.courseAndCertificate,
        workTime: profileDetails.workTime,
        workingPreference: profileDetails.workingPreference,
        languages: profileDetails.languages,
      },
      withdrawals: {
        defaultUpiId: updated.defaultUpiId,
        defaultUpiName: updated.defaultUpiName,
        emergencyUsed,
        emergencyRemaining: Math.max(0, 2 - emergencyUsed),
        monthKey: currentMonthKey,
      },
      manager: updated.role === "MANAGER"
        ? {
            queueSort: updated.managerQueueSort,
            riskOnly: updated.managerRiskOnly,
            autoNext: updated.managerAutoNext,
            proofMode: updated.managerProofMode,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update settings";
    // Unique constraint failures for mobile.
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: "Mobile number already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

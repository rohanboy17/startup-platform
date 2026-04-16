import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/system-settings";
import { parseProfileDetails } from "@/lib/user-profile";
import { getTaxonomyOptionLabel } from "@/lib/work-taxonomy";
import type { Prisma, Role, UserAccountStatus } from "@prisma/client";

function escapeCsv(value: string | number | boolean | null | undefined) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ALLOWED_ROLES: Role[] = ["USER", "BUSINESS", "MANAGER", "ADMIN"];
const ALLOWED_STATUSES: UserAccountStatus[] = ["ACTIVE", "SUSPENDED", "BANNED"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");
  const flagged = searchParams.get("flagged") || "ALL";
  const workMode = searchParams.get("workMode") || "ALL";
  const workingPreference = searchParams.get("workingPreference") || "ALL";
  const education = searchParams.get("education")?.trim().toLowerCase() || "";
  const language = searchParams.get("language")?.trim().toLowerCase() || "";

  const where: Prisma.UserWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
    ];
  }

  if (roleParam && roleParam !== "ALL" && ALLOWED_ROLES.includes(roleParam as Role)) {
    where.role = roleParam as Role;
  }

  if (
    statusParam &&
    statusParam !== "ALL" &&
    ALLOWED_STATUSES.includes(statusParam as UserAccountStatus)
  ) {
    where.accountStatus = statusParam as UserAccountStatus;
  }

  if (flagged === "FLAGGED") {
    where.isSuspicious = true;
  } else if (flagged === "CLEAR") {
    where.isSuspicious = false;
  }

  const settings = await getAppSettings();

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      accountStatus: true,
      balance: true,
      isSuspicious: true,
      suspiciousReason: true,
      ipAddress: true,
      createdAt: true,
      profileDetails: true,
    },
  });

  const filteredUsers = users.filter((user) => {
    const profile = parseProfileDetails(user.profileDetails);
    if (workMode !== "ALL" && profile.workMode !== workMode) return false;
    if (workingPreference !== "ALL" && profile.workingPreference !== workingPreference) return false;
    if (
      education &&
      !(profile.educationQualification || "").toLowerCase().includes(education)
    ) {
      return false;
    }
    if (
      language &&
      !profile.languages.some((item) => item.toLowerCase().includes(language))
    ) {
      return false;
    }
    return true;
  });

  const lines = [
    [
      "id",
      "name",
      "email",
      "mobile",
      "role",
      "accountStatus",
      "balance",
      "isSuspicious",
      "suspiciousReason",
      "ipAddress",
      "workMode",
      "workingPreference",
      "educationQualification",
      "languages",
      "createdAt",
    ].join(","),
    ...filteredUsers.map((user) => {
      const profile = parseProfileDetails(user.profileDetails);
      return [
        escapeCsv(user.id),
        escapeCsv(user.name),
        escapeCsv(user.email),
        escapeCsv(user.mobile),
        escapeCsv(user.role),
        escapeCsv(user.accountStatus),
        escapeCsv(user.balance),
        escapeCsv(user.isSuspicious),
        escapeCsv(user.suspiciousReason),
        escapeCsv(user.ipAddress),
        escapeCsv(getTaxonomyOptionLabel(profile.workMode, settings.profileWorkModeOptions, profile.workMode)),
        escapeCsv(
          getTaxonomyOptionLabel(
            profile.workingPreference,
            settings.workingPreferenceOptions,
            profile.workingPreference
          )
        ),
        escapeCsv(profile.educationQualification),
        escapeCsv(profile.languages.join(" | ")),
        escapeCsv(user.createdAt.toISOString()),
      ].join(",");
    }),
  ];

  const csv = lines.join("\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `admin-users-${timestamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

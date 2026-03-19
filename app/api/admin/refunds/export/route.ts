import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessFundingStatus, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status");
  const flagged = searchParams.get("flagged");
  const dateFrom = searchParams.get("dateFrom")?.trim() || "";
  const dateTo = searchParams.get("dateTo")?.trim() || "";
  const normalizedStatus =
    status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
      ? (status as BusinessFundingStatus)
      : null;
  const createdAtFilter = {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000+05:30`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999+05:30`) } : {}),
  };

  const where: Prisma.BusinessRefundRequestWhereInput = {
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
    ...(dateFrom || dateTo ? { createdAt: createdAtFilter } : {}),
    ...(flagged === "FLAGGED"
      ? { flaggedReason: { not: null as string | null } }
      : flagged === "CLEAR"
        ? { flaggedReason: null as string | null }
        : {}),
    ...(q
      ? {
          OR: [
            { business: { name: { contains: q, mode: "insensitive" as const } } },
            { business: { email: { contains: q, mode: "insensitive" as const } } },
            { business: { mobile: { contains: q, mode: "insensitive" as const } } },
            { requestNote: { contains: q, mode: "insensitive" as const } },
            { reviewNote: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const rows = await prisma.businessRefundRequest.findMany({
    where,
    select: {
      amount: true,
      requestNote: true,
      status: true,
      flaggedReason: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
      business: {
        select: { name: true, email: true, mobile: true },
      },
      reviewedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replaceAll("\"", "\"\"")}"`;
    }
    return text;
  };

  const csv = [
    [
      "Business Name",
      "Business Email",
      "Business Mobile",
      "Amount",
      "Request Note",
      "Status",
      "Flagged Reason",
      "Review Note",
      "Reviewed By",
      "Reviewed At",
      "Created At",
    ].join(","),
    ...rows.map((row) =>
      [
        row.business.name || "",
        row.business.email,
        row.business.mobile || "",
        row.amount.toFixed(2),
        row.requestNote || "",
        row.status,
        row.flaggedReason || "",
        row.reviewNote || "",
        row.reviewedBy?.name || row.reviewedBy?.email || "",
        row.reviewedAt?.toISOString() || "",
        row.createdAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="manual-business-refunds.csv"',
    },
  });
}

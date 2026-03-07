import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const payouts = await prisma.platformPayout.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
      ...((from || to)
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const rows = [
    ["id", "amount", "status", "note", "createdAt", "processedAt"].join(","),
    ...payouts.map((p) =>
      [
        escapeCsv(p.id),
        escapeCsv(p.amount),
        escapeCsv(p.status),
        escapeCsv(p.note),
        escapeCsv(p.createdAt.toISOString()),
        escapeCsv(p.processedAt ? p.processedAt.toISOString() : ""),
      ].join(",")
    ),
  ];

  const filename = `payout-report-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}


import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "PENDING").toUpperCase();
  const q = (searchParams.get("q") || "").trim();

  const flags = await prisma.jobApplicationChatFlag.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as "PENDING" | "REVIEWED" | "DISMISSED" } : {}),
      ...(q
        ? {
            OR: [
              { message: { contains: q, mode: "insensitive" } },
              { application: { job: { title: { contains: q, mode: "insensitive" } } } },
              { application: { user: { name: { contains: q, mode: "insensitive" } } } },
              { application: { job: { business: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      senderRole: true,
      detectedReasons: true,
      status: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
      application: {
        select: {
          id: true,
          job: {
            select: {
              id: true,
              title: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    summary: {
      pending: flags.filter((item) => item.status === "PENDING").length,
      reviewed: flags.filter((item) => item.status === "REVIEWED").length,
      dismissed: flags.filter((item) => item.status === "DISMISSED").length,
    },
    flags: flags.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() || null,
    })),
  });
}

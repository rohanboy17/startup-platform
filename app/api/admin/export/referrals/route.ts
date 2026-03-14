import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number | boolean | null | undefined) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "invites";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (type === "redemptions") {
    const redemptions = await prisma.coinRedemption.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isSuspicious: true,
          },
        },
      },
    });

    const lines = [
      [
        "redemptionId",
        "userId",
        "userName",
        "userEmail",
        "isSuspicious",
        "coinsUsed",
        "walletAmount",
        "status",
        "createdAt",
      ].join(","),
      ...redemptions.map((item) =>
        [
          escapeCsv(item.id),
          escapeCsv(item.user.id),
          escapeCsv(item.user.name),
          escapeCsv(item.user.email),
          escapeCsv(item.user.isSuspicious),
          escapeCsv(item.coinsUsed),
          escapeCsv(item.walletAmount),
          escapeCsv(item.status),
          escapeCsv(item.createdAt.toISOString()),
        ].join(",")
      ),
    ];

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-referral-redemptions-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const invites = await prisma.referralInvite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
          isSuspicious: true,
          referralCode: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      },
      referred: {
        select: {
          id: true,
          name: true,
          email: true,
          isSuspicious: true,
          totalApproved: true,
        },
      },
    },
  });

  const lines = [
    [
      "inviteId",
      "codeUsed",
      "status",
      "referrerUserId",
      "referrerName",
      "referrerEmail",
      "referrerIsSuspicious",
      "referrerCode",
      "referrerCodeIsActive",
      "referredUserId",
      "referredName",
      "referredEmail",
      "referredIsSuspicious",
      "referredTotalApproved",
      "createdAt",
      "qualifiedAt",
      "rewardedAt",
    ].join(","),
    ...invites.map((item) =>
      [
        escapeCsv(item.id),
        escapeCsv(item.codeUsed),
        escapeCsv(item.status),
        escapeCsv(item.referrer.id),
        escapeCsv(item.referrer.name),
        escapeCsv(item.referrer.email),
        escapeCsv(item.referrer.isSuspicious),
        escapeCsv(item.referrer.referralCode?.code),
        escapeCsv(item.referrer.referralCode?.isActive),
        escapeCsv(item.referred.id),
        escapeCsv(item.referred.name),
        escapeCsv(item.referred.email),
        escapeCsv(item.referred.isSuspicious),
        escapeCsv(item.referred.totalApproved),
        escapeCsv(item.createdAt.toISOString()),
        escapeCsv(item.qualifiedAt?.toISOString()),
        escapeCsv(item.rewardedAt?.toISOString()),
      ].join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-referral-invites-${timestamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

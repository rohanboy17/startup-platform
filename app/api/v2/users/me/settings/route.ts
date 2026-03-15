import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      timezone: user.timezone,
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
        profile?: { name?: unknown; mobile?: unknown; timezone?: unknown };
        withdrawals?: { defaultUpiId?: unknown; defaultUpiName?: unknown };
        manager?: { queueSort?: unknown; riskOnly?: unknown; autoNext?: unknown; proofMode?: unknown; timezone?: unknown };
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

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

    return NextResponse.json({
      message: "Settings updated",
      profile: {
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        timezone: updated.timezone,
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

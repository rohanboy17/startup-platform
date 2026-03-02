import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { autoFlagSuspiciousUser } from "@/lib/safety";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const ip = getClientIp(req);
  const session = await auth();

  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rate = consumeRateLimit({
    key: `submit:${session.user.id}:${ip}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    await autoFlagSuspiciousUser({
      userId: session.user.id,
      reason: `Submission rate limit exceeded from IP ${ip}`,
    });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { proof } = await req.json();

  if (!proof) {
    return NextResponse.json({ error: "Proof required" }, { status: 400 });
  }

  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task || task.status !== "ACTIVE") {
    return NextResponse.json({ error: "Task not available" }, { status: 400 });
  }

  if (task.remainingBudget < task.reward) {
    return NextResponse.json({ error: "Task budget exhausted" }, { status: 400 });
  }

  const existing = await prisma.submission.findFirst({
    where: {
      userId: session.user.id,
      taskId,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await prisma.submission.count({
    where: {
      userId: session.user.id,
      createdAt: {
        gte: todayStart,
      },
    },
  });

  if (todayCount >= 20) {
    await autoFlagSuspiciousUser({
      userId: session.user.id,
      reason: "Daily submission limit reached (20/day)",
    });

    return NextResponse.json(
      { error: "Daily submission limit reached" },
      { status: 400 }
    );
  }

  const taskIpCount = await prisma.submission.count({
    where: {
      taskId,
      ipAddress: ip,
      createdAt: { gte: todayStart },
    },
  });

  if (taskIpCount >= 3) {
    await autoFlagSuspiciousUser({
      userId: session.user.id,
      reason: `Task/IP abuse threshold reached for task ${taskId} from IP ${ip}`,
    });

    return NextResponse.json(
      { error: "Too many submissions from this IP for this task today" },
      { status: 400 }
    );
  }

  const submission = await prisma.submission.create({
    data: {
      proof,
      userId: session.user.id,
      taskId,
      ipAddress: ip,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { ipAddress: ip },
  });

  return NextResponse.json({
    message: "Submission created",
    submission,
  });
}

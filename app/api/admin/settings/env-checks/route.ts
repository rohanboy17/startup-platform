import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequiredEnvChecks } from "@/lib/system-settings";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const checks = getRequiredEnvChecks();
  return NextResponse.json(checks);
}

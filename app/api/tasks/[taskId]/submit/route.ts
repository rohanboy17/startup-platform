import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use POST /api/v2/campaigns/:campaignId/submissions instead.",
    },
    { status: 410 }
  );
}

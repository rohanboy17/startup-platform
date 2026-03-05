import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use GET /api/v2/campaigns instead.",
    },
    { status: 410 }
  );
}

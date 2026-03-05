import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use GET /api/v2/business/campaigns instead.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use POST /api/v2/business/campaigns instead.",
    },
    { status: 410 }
  );
}

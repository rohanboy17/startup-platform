import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    {
      error:
        "Direct funding is disabled in production flow. Use POST /api/business/fund/checkout and payment verification.",
    },
    { status: 410 }
  );
}

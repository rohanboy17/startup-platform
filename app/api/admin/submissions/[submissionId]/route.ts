import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use PATCH /api/v2/submissions/:submissionId/admin instead.",
    },
    { status: 410 }
  );
}

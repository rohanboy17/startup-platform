import { NextResponse } from "next/server";
import { generateInitialFeed } from "@/lib/fake-live-feed";

export async function GET() {
  return NextResponse.json(generateInitialFeed());
}

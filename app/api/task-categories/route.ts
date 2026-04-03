import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/system-settings";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(
    { taskCategories: settings.taskCategories },
    { headers: { "Cache-Control": "no-store" } }
  );
}

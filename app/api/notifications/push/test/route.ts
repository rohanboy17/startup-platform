import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushDelivery } from "@/lib/notify";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPushDelivery({
    userId: session.user.id,
    title: "FreeEarnHub test push",
    message: "If you can see this notification, device push is working.",
    templateKey: "push.test",
    payload: { source: "self_test" },
    data: { link: "/dashboard" },
  });

  return NextResponse.json({ message: "Push test sent", result });
}



import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAppSettings } from "@/lib/system-settings";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  const settings = await getAppSettings();

  if (settings.maintenanceMode && role !== "ADMIN") {
    redirect("/maintenance");
  }

  if (role === "USER") redirect("/dashboard/user");
  if (role === "BUSINESS") redirect("/dashboard/business");
  if (role === "MANAGER") redirect("/dashboard/manager");
  if (role === "ADMIN") redirect("/dashboard/admin");

  redirect("/login");
}

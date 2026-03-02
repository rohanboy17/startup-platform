import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const role = session.user.role;

  if (role === "USER") redirect("/dashboard/user");
  if (role === "BUSINESS") redirect("/dashboard/business");
  if (role === "ADMIN") redirect("/dashboard/admin");

  redirect("/api/auth/signin");
}

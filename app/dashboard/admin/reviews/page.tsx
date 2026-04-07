import { redirect } from "next/navigation";

export default async function AdminReviewsRedirect() {
  redirect("/dashboard/admin/campaign-applicants");
}

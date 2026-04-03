import BusinessJobForm from "@/components/business-job-form";
import { getTranslations } from "next-intl/server";

export default async function BusinessCreateJobPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("createJobPageTitle")}</h2>
      <BusinessJobForm />
    </div>
  );
}

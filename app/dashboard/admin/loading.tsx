import { getTranslations } from "next-intl/server";
import FullPageLoader from "@/components/full-page-loader";

export default async function Loading() {
  const t = await getTranslations("dashboard.loading");
  return <FullPageLoader label={t("admin")} />;
}

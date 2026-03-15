import FullPageLoader from "@/components/full-page-loader";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("business.loading");
  return <FullPageLoader label={t("dashboard")} />;
}

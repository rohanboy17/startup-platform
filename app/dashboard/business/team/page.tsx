import BusinessTeamPanel from "@/components/business-team-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessTeamPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business team</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("teamPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Manage owner, editor, and viewer access for this business workspace.
        </p>
      </div>
      <BusinessTeamPanel />
    </div>
  );
}

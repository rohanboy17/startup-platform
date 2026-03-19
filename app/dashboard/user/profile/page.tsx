import UserProfilePanel from "@/components/user-profile-panel";
import UserProfileCompletionBanner from "@/components/user-profile-completion-banner";
import { getTranslations } from "next-intl/server";

export default async function UserProfilePage() {
  const t = await getTranslations("user.profilePage");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/60">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <UserProfileCompletionBanner variant="full" />
      <UserProfilePanel />
    </div>
  );
}

import UserProfilePanel from "@/components/user-profile-panel";

export default function UserProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/60">User profile</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Profile</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70 md:text-base">
          Add your personal and work details so the platform can match you to the right earning opportunities.
        </p>
      </div>

      <UserProfilePanel />
    </div>
  );
}

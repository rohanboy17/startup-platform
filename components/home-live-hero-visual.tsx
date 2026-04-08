"use client";

import HomeHeroVisual from "@/components/home-hero-visual";

type HeroMetrics = {
  totalPayout: number;
  totalUsers: number;
  businessAccounts: number;
  totalCampaigns: number;
  tasksCompleted: number;
};

export default function HomeLiveHeroVisual({ initial }: { initial: HeroMetrics }) {
  return (
    <HomeHeroVisual
      stats={{
        totalUsers: initial.totalUsers,
        businessAccounts: initial.businessAccounts,
        tasksCompleted: initial.tasksCompleted,
        totalPayout: initial.totalPayout,
      }}
    />
  );
}

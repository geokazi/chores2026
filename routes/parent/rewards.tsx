/**
 * Parent Rewards Page - Catalog management + fulfillment queue
 * Reuses RewardsService and GoalsService
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { RewardsService } from "../../lib/services/rewards-service.ts";
import { GoalsService } from "../../lib/services/goals-service.ts";
import type { AvailableReward, RewardPurchase, SavingsGoal } from "../../lib/types/finance.ts";
import ParentRewards from "../../islands/ParentRewards.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface KidWithGoals {
  id: string;
  name: string;
  avatar_emoji: string;
  goals: SavingsGoal[];
}

interface PageData {
  catalog: AvailableReward[];
  pendingPurchases: RewardPurchase[];
  kidsWithGoals: KidWithGoals[];
  familyId: string;
  familyName: string;
  members: { id: string; name: string; role: string; avatar_emoji?: string }[];
  currentProfileId: string;
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    const currentProfile = session.family.members.find(
      (m: any) => m.id === session.user?.profileId,
    );
    if (!currentProfile || currentProfile.role !== "parent") {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    try {
      const rewardsService = new RewardsService();
      const goalsService = new GoalsService();

      // Get catalog (including inactive for management)
      const allRewards = await rewardsService.getAvailableRewards(session.family.id);

      // Get pending purchases (not fulfilled)
      const allPurchases = await rewardsService.getRecentPurchases(session.family.id, undefined, 50);
      const pendingPurchases = allPurchases.filter(p => p.status === "purchased");

      // Get kids and their goals for boost feature
      const kids = session.family.members.filter((m: any) => m.role === "child");
      const kidsWithGoals: KidWithGoals[] = await Promise.all(
        kids.map(async (kid: any) => ({
          id: kid.id,
          name: kid.name,
          avatar_emoji: kid.avatar_emoji || "🧒",
          goals: await goalsService.getGoals(kid.id),
        }))
      );

      return ctx.render({
        catalog: allRewards,
        pendingPurchases,
        kidsWithGoals,
        familyId: session.family.id,
        familyName: session.family.name,
        members: session.family.members,
        currentProfileId: session.user?.profileId || "",
      });
    } catch (error) {
      console.error("Parent rewards error:", error);
      return ctx.render({
        catalog: [],
        pendingPurchases: [],
        kidsWithGoals: [],
        familyId: session.family.id,
        familyName: session.family.name,
        members: session.family.members,
        currentProfileId: session.user?.profileId || "",
        error: "Failed to load rewards data",
      });
    }
  },
};

export default function ParentRewardsPage({ data }: PageProps<PageData>) {
  const currentUser = data.members.find((m) => m.id === data.currentProfileId) || null;

  return (
    <div class="container">
      <AppHeader
        currentPage="rewards"
        pageTitle="Rewards"
        familyMembers={data.members as any}
        currentUser={currentUser as any}
        userRole="parent"
      />

      <ParentRewards
        catalog={data.catalog}
        pendingPurchases={data.pendingPurchases}
        kidsWithGoals={data.kidsWithGoals}
        familyId={data.familyId}
        currentProfileId={data.currentProfileId}
      />

      <AppFooter />
    </div>
  );
}

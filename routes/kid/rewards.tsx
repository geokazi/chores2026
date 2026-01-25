/**
 * Kid Rewards Page - Rewards catalog for kids to claim
 * P3: Rewards Marketplace feature
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { RewardsService } from "../../lib/services/rewards-service.ts";
import { BalanceService } from "../../lib/services/balance-service.ts";
import type { AvailableReward, BalanceInfo, RewardPurchase } from "../../lib/types/finance.ts";
import RewardsCatalog from "../../islands/RewardsCatalog.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  avatar_emoji?: string;
}

interface RewardsData {
  rewards: AvailableReward[];
  balance: BalanceInfo | null;
  recentPurchases: RewardPurchase[];
  dollarValuePerPoint: number;
  familyName: string;
  members: FamilyMember[];
  currentProfileId?: string;
  error?: string;
}

export const handler: Handlers<RewardsData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    const profileId = session.user?.profileId;
    if (!profileId) {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    try {
      const rewardsService = new RewardsService();
      const balanceService = new BalanceService();

      const [rewards, balance, financeSettings, recentPurchases] = await Promise.all([
        rewardsService.getAvailableRewards(session.family.id),
        balanceService.getProfileBalance(profileId, session.family.id),
        balanceService.getFinanceSettings(session.family.id),
        rewardsService.getRecentPurchases(session.family.id, profileId, 5),
      ]);

      const members: FamilyMember[] = session.family.members.map((m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatar_emoji: m.avatar_emoji,
      }));

      return ctx.render({
        rewards,
        balance,
        recentPurchases,
        dollarValuePerPoint: financeSettings.dollarValuePerPoint,
        familyName: session.family.name,
        members,
        currentProfileId: profileId,
      });
    } catch (error) {
      console.error("❌ Rewards error:", error);
      return ctx.render({
        rewards: [],
        balance: null,
        recentPurchases: [],
        dollarValuePerPoint: 1.0,
        familyName: session.family.name,
        members: [],
        currentProfileId: profileId,
        error: "Failed to load rewards",
      });
    }
  },
};

export default function RewardsPage({ data }: PageProps<RewardsData>) {
  const currentUser = data.members.find((m) => m.id === data.currentProfileId) || null;
  const userRole = currentUser?.role || "child";

  return (
    <div class="container">
      <AppHeader
        currentPage="rewards"
        pageTitle="Rewards"
        familyMembers={data.members}
        currentUser={currentUser}
        userRole={userRole}
      />

      <div class="rewards-page">
        {data.error ? (
          <div class="error-card">{data.error}</div>
        ) : (
          <RewardsCatalog
            rewards={data.rewards}
            balance={data.balance}
            recentPurchases={data.recentPurchases}
            dollarValuePerPoint={data.dollarValuePerPoint}
            profileId={data.currentProfileId || ""}
          />
        )}
      </div>

      <AppFooter />

      <style>{`
        .rewards-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }
        .error-card {
          background: #fef3cd;
          color: #856404;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

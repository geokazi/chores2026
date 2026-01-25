/**
 * Parent Balances Page - Per-kid balance cards with Pay Out
 * P2: Balance & Pay Out feature
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { BalanceService } from "../../lib/services/balance-service.ts";
import { RewardsService } from "../../lib/services/rewards-service.ts";
import type { BalanceInfo, RewardPurchase } from "../../lib/types/finance.ts";
import BalanceCards from "../../islands/BalanceCards.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  avatar_emoji?: string;
}

interface BalancesData {
  balances: BalanceInfo[];
  recentPurchases: RewardPurchase[];
  dollarValuePerPoint: number;
  familyName: string;
  members: FamilyMember[];
  currentProfileId?: string;
  error?: string;
}

export const handler: Handlers<BalancesData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    // Verify parent role
    const currentProfile = session.family.members.find(
      (m: any) => m.id === session.user?.profileId,
    );
    if (!currentProfile || currentProfile.role !== "parent") {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    try {
      const balanceService = new BalanceService();
      const rewardsService = new RewardsService();

      const [balances, financeSettings, recentPurchases] = await Promise.all([
        balanceService.getFamilyBalances(session.family.id),
        balanceService.getFinanceSettings(session.family.id),
        rewardsService.getRecentPurchases(session.family.id, undefined, 10),
      ]);

      const members: FamilyMember[] = session.family.members.map((m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatar_emoji: m.avatar_emoji,
      }));

      return ctx.render({
        balances,
        recentPurchases,
        dollarValuePerPoint: financeSettings.dollarValuePerPoint,
        familyName: session.family.name,
        members,
        currentProfileId: session.user?.profileId,
      });
    } catch (error) {
      console.error("❌ Balances error:", error);
      return ctx.render({
        balances: [],
        recentPurchases: [],
        dollarValuePerPoint: 1.0,
        familyName: session.family.name,
        members: [],
        currentProfileId: session.user?.profileId,
        error: "Failed to load balances",
      });
    }
  },
};

export default function BalancesPage({ data }: PageProps<BalancesData>) {
  const currentUser = data.members.find((m) => m.id === data.currentProfileId) || null;

  return (
    <div class="container">
      <AppHeader
        currentPage="balances"
        pageTitle="Balances"
        familyMembers={data.members}
        currentUser={currentUser}
        userRole="parent"
      />

      <div class="balances-page">
        <p class="subtitle">{data.familyName} — Kids' Earnings</p>

        {data.error ? (
          <div class="error-card">{data.error}</div>
        ) : (
          <BalanceCards
            balances={data.balances}
            recentPurchases={data.recentPurchases}
            dollarValuePerPoint={data.dollarValuePerPoint}
          />
        )}
      </div>

      <AppFooter />

      <style>{`
        .balances-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }
        .subtitle {
          margin: 0 0 1rem;
          color: #666;
          font-size: 0.875rem;
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

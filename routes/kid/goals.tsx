/**
 * Kid Goals Page - Savings goals for kids
 * P4: Savings Goals feature
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { GoalsService } from "../../lib/services/goals-service.ts";
import { BalanceService } from "../../lib/services/balance-service.ts";
import type { BalanceInfo, SavingsGoal } from "../../lib/types/finance.ts";
import SavingsGoals from "../../islands/SavingsGoals.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  avatar_emoji?: string;
}

interface GoalsData {
  goals: SavingsGoal[];
  balance: BalanceInfo | null;
  dollarValuePerPoint: number;
  familyName: string;
  members: FamilyMember[];
  currentProfileId?: string;
  error?: string;
}

export const handler: Handlers<GoalsData> = {
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
      const goalsService = new GoalsService();
      const balanceService = new BalanceService();

      const [goals, balance, financeSettings] = await Promise.all([
        goalsService.getGoals(profileId),
        balanceService.getProfileBalance(profileId, session.family.id),
        balanceService.getFinanceSettings(session.family.id),
      ]);

      const members: FamilyMember[] = session.family.members.map((m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatar_emoji: m.avatar_emoji,
      }));

      return ctx.render({
        goals,
        balance,
        dollarValuePerPoint: financeSettings.dollarValuePerPoint,
        familyName: session.family.name,
        members,
        currentProfileId: profileId,
      });
    } catch (error) {
      console.error("❌ Goals error:", error);
      return ctx.render({
        goals: [],
        balance: null,
        dollarValuePerPoint: 1.0,
        familyName: session.family.name,
        members: [],
        currentProfileId: profileId,
        error: "Failed to load goals",
      });
    }
  },
};

export default function GoalsPage({ data }: PageProps<GoalsData>) {
  const currentUser = data.members.find((m) => m.id === data.currentProfileId) || null;
  const userRole = currentUser?.role || "child";

  return (
    <div class="container">
      <AppHeader
        currentPage="goals"
        pageTitle="My Goals"
        familyMembers={data.members}
        currentUser={currentUser}
        userRole={userRole}
      />

      <div class="goals-page">
        {data.error ? (
          <div class="error-card">{data.error}</div>
        ) : (
          <SavingsGoals
            goals={data.goals}
            balance={data.balance}
            dollarValuePerPoint={data.dollarValuePerPoint}
            profileId={data.currentProfileId || ""}
          />
        )}
      </div>

      <AppFooter />

      <style>{`
        .goals-page {
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

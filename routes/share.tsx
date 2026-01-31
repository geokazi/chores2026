/**
 * Share ChoreGami - Referral Page
 * Accessible to any logged-in family member (no PIN required)
 * Playful UX to encourage sharing
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { ReferralService } from "../lib/services/referral-service.ts";
import { calculateStreak } from "../lib/services/insights-service.ts";
import { createClient } from "../lib/supabase.ts";
import ShareReferralCard from "../islands/ShareReferralCard.tsx";
import AppHeader from "../islands/AppHeader.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
  user_id?: string;
}

interface WeeklyStats {
  choresCompleted: number;
  streakDays: number;
}

interface SharePageData {
  familyMembers: FamilyMember[];
  currentUser: FamilyMember | null;
  userRole: "parent" | "child";
  referral: { code: string; conversions: number; monthsEarned: number; baseUrl: string };
  weeklyStats: WeeklyStats | null;
  error?: string;
}

export const handler: Handlers<SharePageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    const { family } = session;
    const currentUser = family.members.find((m: any) => m.id === session.user?.profileId) || null;
    const userRole = currentUser?.role === "parent" ? "parent" : "child";

    // Load or create referral code
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://choregami.fly.dev";
    let referral: { code: string; conversions: number; monthsEarned: number; baseUrl: string };

    try {
      const referralService = new ReferralService();
      const stats = await referralService.getStats(family.id);
      if (stats) {
        referral = { ...stats, baseUrl: appBaseUrl };
      } else {
        return ctx.render({
          familyMembers: family.members,
          currentUser,
          userRole,
          weeklyStats: null,
          error: "Could not load referral code",
        } as any);
      }
    } catch (e) {
      console.error("[Share] Failed to load referral:", e);
      return ctx.render({
        familyMembers: family.members,
        currentUser,
        userRole,
        weeklyStats: null,
        error: "Could not load referral code",
      } as any);
    }

    // Fetch weekly stats for personalized sharing (non-blocking)
    let weeklyStats: WeeklyStats | null = null;
    try {
      const supabase = createClient();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get chore completions from last 7 days
      const { data: transactions } = await supabase
        .schema("choretracker")
        .from("chore_transactions")
        .select("created_at")
        .eq("family_id", family.id)
        .eq("transaction_type", "chore_completed")
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: false });

      if (transactions && transactions.length > 0) {
        const choresCompleted = transactions.length;
        const streakDays = calculateStreak(transactions.map(t => t.created_at));
        weeklyStats = { choresCompleted, streakDays };
      }
    } catch (e) {
      console.warn("[Share] Could not load weekly stats:", e);
      // Non-blocking - continue with simple version
    }

    return ctx.render({
      familyMembers: family.members,
      currentUser,
      userRole,
      referral,
      weeklyStats,
    });
  },
};

export default function SharePage({ data }: PageProps<SharePageData>) {
  const { familyMembers, currentUser, userRole, referral, weeklyStats, error } = data;

  if (error) {
    return (
      <>
        <Head>
          <title>Share ChoreGami</title>
        </Head>
        <AppHeader
          currentPage="share"
          pageTitle="Share"
          familyMembers={familyMembers}
          currentUser={currentUser}
          userRole={userRole}
        />
        <main class="share-page">
          <div class="share-error">
            <p>Oops! {error}</p>
            <a href="/" class="back-link">← Back home</a>
          </div>
        </main>
        <AppFooter />
        <style>{pageStyles}</style>
      </>
    );
  }

  // Progress message (only show when they've made progress)
  const progressMessage = referral.conversions === 1
    ? "You're on a roll! Keep sharing!"
    : referral.conversions > 1 && referral.conversions < 6
    ? `${6 - referral.monthsEarned} more to max out!`
    : referral.conversions >= 6
    ? "You're a ChoreGami champion! 🏆"
    : null;

  return (
    <>
      <Head>
        <title>Share ChoreGami</title>
      </Head>

      <AppHeader
        currentPage="share"
        pageTitle="Share"
        familyMembers={familyMembers}
        currentUser={currentUser}
        userRole={userRole}
      />

      <main class="share-page">
        <div class="share-hero">
          <div class="share-emoji">🎁</div>
          <p class="share-subtitle">Help other families discover ChoreGami</p>
        </div>

        {progressMessage && (
          <div class="share-encouragement">
            {progressMessage}
          </div>
        )}

        <ShareReferralCard
          code={referral.code}
          conversions={referral.conversions}
          monthsEarned={referral.monthsEarned}
          baseUrl={referral.baseUrl}
          weeklyStats={weeklyStats}
        />

        <div class="share-tip">
          💡 Text, post, or just tell someone!
        </div>
      </main>

      <AppFooter />
      <style>{pageStyles}</style>
    </>
  );
}

const pageStyles = `
  .share-page {
    min-height: calc(100vh - 120px);
    padding: 20px;
    max-width: 500px;
    margin: 0 auto;
  }
  .share-hero {
    text-align: center;
    margin-bottom: 24px;
  }
  .share-emoji {
    font-size: 4rem;
    line-height: 1;
    margin-bottom: 8px;
    animation: gentle-bounce 2s ease-in-out infinite;
  }
  @keyframes gentle-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .share-subtitle {
    font-size: 1rem;
    color: var(--text-secondary, #666);
    margin: 0;
  }
  .share-encouragement {
    text-align: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #ecfdf5 100%);
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 0.95rem;
    color: var(--color-primary, #10b981);
    font-weight: 500;
  }
  .share-tip {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-secondary, #666);
    margin-top: 24px;
    padding: 12px 16px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 12px;
  }
  .share-error {
    text-align: center;
    padding: 40px 20px;
  }
  .back-link {
    color: var(--color-primary, #10b981);
    text-decoration: none;
  }
`;

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
  /* Modern gradient background */
  .share-page {
    min-height: calc(100vh - 120px);
    padding: 24px 20px 40px;
    max-width: 480px;
    margin: 0 auto;
    position: relative;
  }

  /* Gradient overlay behind content */
  .share-page::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      145deg,
      var(--color-bg, #f0fdf4) 0%,
      rgba(255, 255, 255, 0.9) 50%,
      var(--color-bg, #ecfdf5) 100%
    );
    z-index: -1;
  }

  /* Hero section */
  .share-hero {
    text-align: center;
    margin-bottom: 28px;
    padding-top: 8px;
  }
  .share-emoji {
    font-size: 4.5rem;
    line-height: 1;
    margin-bottom: 12px;
    animation: gentle-bounce 2.5s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  @keyframes gentle-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-10px) scale(1.02); }
  }
  .share-subtitle {
    font-size: 1.1rem;
    color: var(--color-text, #064e3b);
    margin: 0;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  /* Progress encouragement */
  .share-encouragement {
    text-align: center;
    padding: 14px 20px;
    background: linear-gradient(
      135deg,
      rgba(var(--color-primary-rgb, 16, 185, 129), 0.1) 0%,
      rgba(var(--color-primary-rgb, 16, 185, 129), 0.05) 100%
    );
    border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.2);
    border-radius: 14px;
    margin-bottom: 24px;
    font-size: 0.95rem;
    color: var(--color-primary, #10b981);
    font-weight: 600;
  }

  /* Tip section */
  .share-tip {
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-secondary, #666);
    margin-top: 28px;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 14px;
    border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
  }

  /* Error state */
  .share-error {
    text-align: center;
    padding: 48px 24px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    margin-top: 20px;
  }
  .back-link {
    color: var(--color-primary, #10b981);
    text-decoration: none;
    font-weight: 500;
    transition: opacity 0.2s;
  }
  .back-link:hover {
    opacity: 0.8;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .share-emoji {
      animation: none;
    }
  }
`;

/**
 * Share ChoreGami - Referral Page
 * Accessible to any logged-in family member (no PIN required)
 * Playful UX to encourage sharing
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { ReferralService } from "../lib/services/referral-service.ts";
import { calculateStreak, getLocalDate } from "../lib/services/insights-service.ts";
import { getServiceSupabaseClient } from "../lib/supabase.ts";
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
  eventsPlanned: number;
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
    // Use request host for URL, defaulting to production domain
    const url = new URL(req.url);
    const appBaseUrl = url.hostname === "localhost"
      ? `${url.protocol}//${url.host}`
      : "https://choregami.app";
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
    // Uses same logic as Reports page: Sunday-first weeks, all positive transactions
    let weeklyStats: WeeklyStats | null = null;
    try {
      const supabase = getServiceSupabaseClient();

      // Get timezone from URL or default (same as Reports page)
      const url = new URL(req.url);
      const timezone = url.searchParams.get("tz") || "America/Los_Angeles";

      // Calculate Sunday-first week start (same as getFamilyAnalytics in chore-service)
      const now = new Date();
      const todayLocal = getLocalDate(now.toISOString(), timezone);
      const [yearStr, monthStr, dayStr] = todayLocal.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const todayDate = new Date(year, month - 1, day);
      const dayOfWeek = todayDate.getDay(); // 0=Sun
      const weekStartLocal = new Date(year, month - 1, day - dayOfWeek);
      const weekStartStr = `${weekStartLocal.getFullYear()}-${String(weekStartLocal.getMonth() + 1).padStart(2, "0")}-${String(weekStartLocal.getDate()).padStart(2, "0")}`;

      // Get ALL positive transactions (same as Reports - not just chore_completed)
      const { data: transactions } = await supabase
        .schema("choretracker")
        .from("chore_transactions")
        .select("profile_id, created_at, points_change")
        .eq("family_id", family.id)
        .gt("points_change", 0);

      // Type for transaction rows
      interface TxRow { profile_id: string; created_at: string; points_change: number; }
      const txData = (transactions || []) as TxRow[];

      // Filter to this week using local dates (same as Reports)
      const weekTransactions = txData.filter(
        (t) => getLocalDate(t.created_at, timezone) >= weekStartStr
      );

      // Count chores completed this week (matches Reports' earned_week logic)
      const choresCompleted = weekTransactions.length;

      // Calculate max individual streak (not combined family streak)
      // Group transactions by profile_id and find the best streak
      const profileIds = [...new Set(txData.map((t) => t.profile_id))];
      let maxStreak = 0;
      for (const profileId of profileIds) {
        const profileTx = txData.filter((t) => t.profile_id === profileId);
        const profileStreak = calculateStreak(profileTx.map((t) => t.created_at));
        if (profileStreak > maxStreak) maxStreak = profileStreak;
      }

      // Get total events planned for this family (matching pattern from events.tsx)
      const { count: eventsCount, error: eventsError } = await supabase
        .schema("choretracker")
        .from("family_events")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("is_deleted", false);

      console.log("[Share] Events query result:", {
        familyId: family.id,
        eventsCount,
        eventsError: eventsError?.message || null,
      });

      weeklyStats = {
        choresCompleted,
        streakDays: maxStreak,
        eventsPlanned: eventsCount || 0,
      };
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
          <div class="share-emoji">💛</div>
          <h2 class="share-title">Help another family feel more organized</h2>
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
          📱 Text it, or just mention it next time you chat
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
  .share-title {
    font-size: 1.35rem;
    color: var(--color-text, #064e3b);
    margin: 0;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.3;
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

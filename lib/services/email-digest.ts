/**
 * Email Digest Service
 * Builds and sends weekly digest emails/SMS to opted-in parents.
 * Features:
 * - Dual-trigger safe (idempotent via last_sent_at)
 * - Global email budget cap (GLOBAL_EMAIL_BUDGET)
 * - SMS gate with auto-fallback to email
 * - Usage tracking via incrementUsage()
 */

import { Resend } from "npm:resend";
import { createClient } from "@supabase/supabase-js";
import { FEATURE_LIMITS, GLOBAL_EMAIL_BUDGET } from "../../config/feature-limits.ts";
import { incrementUsage, getMonthlyUsage } from "./usage-tracker.ts";
import { resolvePhone, hasRealEmail } from "../utils/resolve-phone.ts";
import { getExpectedDaysForProfile, calculateStreak, calculateConsistency } from "./insights-service.ts";

interface DigestResult {
  sent: number;
  skipped: number;
  errors: number;
  error?: string;
}

interface DigestContent {
  familyName: string;
  parentName: string;
  events: Array<{ date: string; title: string; time?: string; emoji?: string }>;
  stats: {
    choresCompleted: number;
    choresTotal: number;
    prevWeekCompleted: number;
    prevWeekTotal: number;
    topEarner?: { name: string; points: number };
  };
  leaderboard: Array<{ name: string; totalPoints: number; weeklyPoints: number; streak: number; consistency: number }>;
  weeklyEarnings: number;
  goalProgress?: {
    target: number;
    current: number;
    achieved: boolean;
    bonus: number;
  };
  insights: string[];
  // P1-P4: Financial education features
  behavioralInsights: {
    trendDirection: "improving" | "stable" | "declining";
    avgConsistency: number;
    totalActiveDays: number;
    topPerformer?: { name: string; consistency: number };
  };
  balances: Array<{ name: string; points: number; dollars: number }>;
  rewardsThisWeek: {
    pending: Array<{ kidName: string; rewardName: string; icon: string }>;
    fulfilled: Array<{ kidName: string; rewardName: string; icon: string }>;
  };
  savingsGoals: Array<{ kidName: string; goalName: string; icon: string; current: number; target: number; percent: number }>;
  payoutsThisWeek: Array<{ kidName: string; amount: number }>;
  dollarValuePerPoint: number;
}

/**
 * Main entry point — called by both Deno.cron and HTTP fallback.
 * Idempotent: checks last_sent_at per profile before sending.
 */
export async function sendWeeklyDigests(): Promise<DigestResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Global email budget cap — prevent catastrophic runaway
  const { data: allParents } = await supabase
    .from("family_profiles")
    .select("preferences")
    .eq("role", "parent")
    .not("preferences->notifications->weekly_summary", "is", null);

  const totalSentThisMonth = allParents?.reduce((sum, p) => {
    return sum + (p.preferences?.notifications?.usage?.this_month_digests || 0);
  }, 0) || 0;

  if (totalSentThisMonth >= GLOBAL_EMAIL_BUDGET) {
    console.error("[digest] GLOBAL EMAIL BUDGET REACHED:", totalSentThisMonth);
    return { sent: 0, skipped: 0, errors: 0, error: "budget_exceeded" };
  }

  // Get eligible parents (opted-in, not yet sent this cycle)
  const lastSunday = getLastSunday();
  const lastSundayISO = lastSunday.toISOString();

  const { data: profiles, error: profileError } = await supabase
    .from("family_profiles")
    .select("id, name, user_id, family_id, preferences")
    .eq("role", "parent")
    .not("user_id", "is", null);

  if (profileError || !profiles) {
    console.error("[digest] Failed to fetch profiles:", profileError);
    return { sent: 0, skipped: 0, errors: 1, error: "db_error" };
  }

  const result: DigestResult = { sent: 0, skipped: 0, errors: 0 };

  for (const profile of profiles) {
    const notifPrefs = profile.preferences?.notifications;

    // Skip if not opted in
    if (!notifPrefs?.weekly_summary) {
      continue;
    }

    // Idempotency: skip if already sent this cycle
    const lastSentAt = notifPrefs?.last_sent_at;
    if (lastSentAt && new Date(lastSentAt) >= lastSunday) {
      result.skipped++;
      continue;
    }

    try {
      // Resolve contact info from auth.users
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!user) {
        console.warn(`[digest] No auth user for profile ${profile.id}`);
        result.errors++;
        continue;
      }

      const emailValid = hasRealEmail(user.email);
      const resolvedPhone = resolvePhone(user);
      let channel = notifPrefs.digest_channel || (emailValid ? "email" : "sms");

      // SMS gate: check monthly limit, auto-fallback to email
      if (channel === "sms") {
        const tier = (profile as any).subscription?.tier || "free";
        const limit = FEATURE_LIMITS[tier as keyof typeof FEATURE_LIMITS]?.sms_per_month ?? FEATURE_LIMITS.free.sms_per_month;
        const monthlyUsage = getMonthlyUsage(profile, "digests");

        if (monthlyUsage >= limit) {
          console.log(`[digest] [${profile.name}] SMS limit reached (${monthlyUsage}/${limit}). Falling back to email.`);
          if (emailValid) {
            channel = "email";
            // Flag sms_limit_hit for settings UI banner
            await supabase.from("family_profiles").update({
              preferences: {
                ...profile.preferences,
                notifications: {
                  ...notifPrefs,
                  sms_limit_hit: true,
                },
              },
            }).eq("id", profile.id);
          } else {
            // No email available, skip entirely
            result.skipped++;
            continue;
          }
        }
      }

      // Build digest content
      const content = await buildDigestContent(supabase, profile);

      // Send based on channel
      let sendSuccess = false;
      if (channel === "email" && emailValid) {
        sendSuccess = await sendEmailDigest(user.email!, content);
      } else if (channel === "sms" && resolvedPhone) {
        sendSuccess = await sendSmsDigest(resolvedPhone, content);
      } else if (emailValid) {
        // Fallback to email if preferred channel unavailable
        sendSuccess = await sendEmailDigest(user.email!, content);
      }

      if (sendSuccess) {
        // Record last_sent_at + increment usage
        await supabase.from("family_profiles").update({
          preferences: {
            ...profile.preferences,
            notifications: {
              ...notifPrefs,
              last_sent_at: new Date().toISOString(),
            },
          },
        }).eq("id", profile.id);

        await incrementUsage(profile.id, "digests");
        result.sent++;
      } else {
        result.errors++;
      }
    } catch (err) {
      console.error(`[digest] Error for profile ${profile.id}:`, err);
      result.errors++;
    }
  }

  console.log(`[digest] Complete: sent=${result.sent}, skipped=${result.skipped}, errors=${result.errors}`);
  return result;
}

/**
 * Generate personalized insight one-liners from digest data.
 * Prioritizes behavioral insights (P1) as most important.
 */
function generateInsights(content: {
  stats: { choresCompleted: number; choresTotal: number; prevWeekCompleted: number; prevWeekTotal: number };
  leaderboard: Array<{ name: string; streak: number; weeklyPoints: number; consistency: number }>;
  goalProgress?: { achieved: boolean };
  behavioralInsights?: { trendDirection: string; avgConsistency: number; topPerformer?: { name: string; consistency: number } };
  rewardsThisWeek?: { pending: Array<unknown>; fulfilled: Array<unknown> };
  savingsGoals?: Array<{ kidName: string; goalName: string; percent: number }>;
}): string[] {
  const insights: string[] = [];
  const { stats, leaderboard, goalProgress, behavioralInsights, rewardsThisWeek, savingsGoals } = content;

  // P1: Behavioral trend insight (HIGHEST PRIORITY)
  if (behavioralInsights) {
    if (behavioralInsights.trendDirection === "improving" && behavioralInsights.avgConsistency >= 70) {
      insights.push(`Family habits are improving — ${behavioralInsights.avgConsistency}% consistency!`);
    } else if (behavioralInsights.trendDirection === "declining") {
      insights.push("Consistency dropped this week — a fresh start awaits next week!");
    }
  }

  // Perfect week
  if (stats.choresTotal > 0 && stats.choresCompleted === stats.choresTotal) {
    insights.push("PERFECT WEEK! Every single chore completed!");
  }

  // Week-over-week improvement
  if (stats.prevWeekTotal > 0 && stats.choresTotal > 0) {
    const prevPercent = (stats.prevWeekCompleted / stats.prevWeekTotal) * 100;
    const currPercent = (stats.choresCompleted / stats.choresTotal) * 100;
    const delta = currPercent - prevPercent;
    if (delta > 20) {
      insights.push(`Up ${Math.round(delta)}% from last week — great momentum!`);
    }
  }

  // Goal reached
  if (goalProgress?.achieved) {
    insights.push("Family goal reached! Everyone earned the bonus!");
  }

  // P4: Savings goal nearly achieved
  if (savingsGoals && savingsGoals.length > 0) {
    const almostThere = savingsGoals.find(g => g.percent >= 90 && g.percent < 100);
    if (almostThere) {
      insights.push(`${almostThere.kidName} is ${100 - almostThere.percent}% away from "${almostThere.goalName}"!`);
    }
  }

  // P3: Rewards to give
  if (rewardsThisWeek && rewardsThisWeek.pending.length > 0) {
    insights.push(`${rewardsThisWeek.pending.length} reward${rewardsThisWeek.pending.length > 1 ? "s" : ""} waiting to be given!`);
  }

  // Longest streak in family
  const streakers = leaderboard.filter((m) => m.streak > 0).sort((a, b) => b.streak - a.streak);
  if (streakers.length > 0 && streakers[0].streak >= 7) {
    insights.push(`${streakers[0].name} is on a ${streakers[0].streak}-day streak!`);
  }

  // New streak starting (3 days)
  const newStreakers = leaderboard.filter((m) => m.streak === 3);
  for (const s of newStreakers.slice(0, 1)) {
    if (!insights.some((i) => i.includes(s.name))) {
      insights.push(`${s.name} started a new 3-day streak!`);
    }
  }

  // High consistency (habit forming)
  const highConsistency = leaderboard.filter(m => m.consistency >= 80).sort((a, b) => b.consistency - a.consistency);
  if (highConsistency.length > 0 && !insights.some(i => i.includes(highConsistency[0].name))) {
    insights.push(`${highConsistency[0].name} has ${highConsistency[0].consistency}% consistency — habit forming!`);
  }

  return insights.slice(0, 3); // Max 3 insights (increased from 2 for P1-P4)
}

/**
 * Build digest content for a parent profile.
 */
async function buildDigestContent(
  supabase: any,
  profile: { id: string; name: string; family_id: string },
): Promise<DigestContent> {
  // Get family name + goal settings
  const { data: family } = await supabase
    .from("families")
    .select("name, settings")
    .eq("id", profile.family_id)
    .single();

  // Get all family members for leaderboard (include preferences for P4 goals)
  const { data: members } = await supabase
    .from("family_profiles")
    .select("id, name, current_points, role, preferences")
    .eq("family_id", profile.family_id)
    .eq("is_deleted", false)
    .order("current_points", { ascending: false });

  // Get upcoming events (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const { data: events } = await supabase
    .schema("choretracker")
    .from("family_events")
    .select("title, event_date, schedule_data, metadata")
    .eq("family_id", profile.family_id)
    .eq("is_deleted", false)
    .gte("event_date", todayStr)
    .lte("event_date", nextWeekStr)
    .order("event_date", { ascending: true })
    .limit(10);

  // Get this week's chore transactions (last 7 days)
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const { data: transactions } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("profile_id, points_change, transaction_type, created_at")
    .eq("family_id", profile.family_id)
    .eq("transaction_type", "chore_completed")
    .gte("created_at", lastWeekStart.toISOString());

  // Get this week's assignments
  const { data: assignments } = await supabase
    .schema("choretracker")
    .from("chore_assignments")
    .select("id")
    .eq("family_id", profile.family_id)
    .gte("assigned_date", lastWeekStart.toISOString().slice(0, 10))
    .lte("assigned_date", todayStr);

  // Get previous week's transactions (7-14 days ago) for week-over-week
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: prevTransactions } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("profile_id, points_change")
    .eq("family_id", profile.family_id)
    .eq("transaction_type", "chore_completed")
    .gte("created_at", twoWeeksAgo.toISOString())
    .lt("created_at", lastWeekStart.toISOString());

  const { data: prevAssignments } = await supabase
    .schema("choretracker")
    .from("chore_assignments")
    .select("id")
    .eq("family_id", profile.family_id)
    .gte("assigned_date", twoWeeksAgo.toISOString().slice(0, 10))
    .lt("assigned_date", lastWeekStart.toISOString().slice(0, 10));

  // Get last 30 days of transactions for streak calculation
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: streakTransactions } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("profile_id, created_at")
    .eq("family_id", profile.family_id)
    .eq("transaction_type", "chore_completed")
    .gte("created_at", thirtyDaysAgo.toISOString());

  // P3: Get reward purchases this week (pending and fulfilled)
  const { data: rewardPurchases } = await supabase
    .schema("choretracker")
    .from("reward_purchases")
    .select("profile_id, reward_name, reward_icon, status, created_at, fulfilled_at")
    .eq("family_id", profile.family_id)
    .gte("created_at", lastWeekStart.toISOString())
    .in("status", ["pending", "fulfilled"]);

  // P2: Get payouts this week (cash_out transactions)
  const { data: payoutTransactions } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("profile_id, points_change")
    .eq("family_id", profile.family_id)
    .eq("transaction_type", "cash_out")
    .gte("created_at", lastWeekStart.toISOString());

  // Calculate per-member weekly earnings and streaks
  const weeklyEarnerMap = new Map<string, number>();
  const streakDatesMap = new Map<string, string[]>();

  (transactions as any[] || []).forEach((t: any) => {
    weeklyEarnerMap.set(t.profile_id, (weeklyEarnerMap.get(t.profile_id) || 0) + t.points_change);
  });

  (streakTransactions as any[] || []).forEach((t: any) => {
    const dates = streakDatesMap.get(t.profile_id) || [];
    dates.push(t.created_at);
    streakDatesMap.set(t.profile_id, dates);
  });

  // Build leaderboard with weekly points, streaks, and template-aware consistency
  const familySettings = (family?.settings as Record<string, unknown>) || null;
  const leaderboard = (members as any[] || []).map((m: any) => {
    const expectedPerWeek = getExpectedDaysForProfile(familySettings, m.id);
    return {
      name: m.name as string,
      totalPoints: m.current_points as number,
      weeklyPoints: weeklyEarnerMap.get(m.id) || 0,
      streak: calculateStreak(streakDatesMap.get(m.id) || []),
      consistency: calculateConsistency(streakDatesMap.get(m.id) || [], expectedPerWeek),
    };
  });

  // Calculate total weekly earnings
  const weeklyEarnings = [...weeklyEarnerMap.values()].reduce((a, b) => a + b, 0);

  // Find top earner this week
  let topEarner: { name: string; points: number } | undefined;
  const topWeekly = leaderboard
    .filter((m) => m.weeklyPoints > 0)
    .sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  if (topWeekly.length > 0) {
    topEarner = { name: topWeekly[0].name, points: topWeekly[0].weeklyPoints };
  }

  // Calculate goal progress
  let goalProgress: DigestContent["goalProgress"] | undefined;
  const goalSettings = (family as any)?.settings?.apps?.choregami;
  if (goalSettings?.weekly_goal) {
    const pointsPerDollar = goalSettings.points_per_dollar || 1;
    const earnedDollars = weeklyEarnings / pointsPerDollar;
    goalProgress = {
      target: goalSettings.weekly_goal,
      current: Math.round(earnedDollars),
      achieved: earnedDollars >= goalSettings.weekly_goal,
      bonus: goalSettings.goal_bonus || 0,
    };
  }

  const choresCompleted = (transactions as any[] || []).length;
  const choresTotal = (assignments as any[] || []).length;
  const prevWeekCompleted = (prevTransactions as any[] || []).length;
  const prevWeekTotal = (prevAssignments as any[] || []).length;

  // Generate insights (moved to after P1-P4 data is computed)
  // Placeholder - will be computed after P1-P4 data
  let insights: string[] = [];

  // P1: Compute behavioral insights (trend direction, consistency)
  const childMembers = (members as any[] || []).filter((m: any) => m.role === "child");
  const avgConsistency = childMembers.length > 0
    ? Math.round(leaderboard.filter((l) => childMembers.some((c: any) => c.name === l.name))
        .reduce((sum, l) => sum + l.consistency, 0) / childMembers.length)
    : 0;

  // Calculate trend direction from week-over-week delta
  const weekOverWeekDelta = (choresTotal > 0 && prevWeekTotal > 0)
    ? ((choresCompleted / choresTotal) - (prevWeekCompleted / prevWeekTotal)) * 100
    : 0;
  const trendDirection: "improving" | "stable" | "declining" =
    weekOverWeekDelta > 5 ? "improving" : weekOverWeekDelta < -5 ? "declining" : "stable";

  // Total active days (unique days with any activity across all members)
  const totalActiveDays = new Set(
    (streakTransactions as any[] || []).map((t: any) => t.created_at.slice(0, 10))
  ).size;

  // Top performer by consistency
  const sortedByConsistency = leaderboard
    .filter((l) => childMembers.some((c: any) => c.name === l.name) && l.consistency > 0)
    .sort((a, b) => b.consistency - a.consistency);
  const topPerformer = sortedByConsistency.length > 0
    ? { name: sortedByConsistency[0].name, consistency: sortedByConsistency[0].consistency }
    : undefined;

  // P2: Build per-kid balance info
  const financeSettings = (family as any)?.settings?.apps?.choregami?.finance || {};
  const dollarValuePerPoint = financeSettings.dollarValuePerPoint || 1.0;

  const balances = childMembers.map((m: any) => ({
    name: m.name as string,
    points: m.current_points as number || 0,
    dollars: Math.round(((m.current_points || 0) * dollarValuePerPoint) * 100) / 100,
  }));

  // P3: Build rewards this week (pending + fulfilled)
  const profileNameMap = new Map((members as any[] || []).map((m: any) => [m.id, m.name]));
  const pendingRewards = (rewardPurchases as any[] || [])
    .filter((r: any) => r.status === "pending")
    .map((r: any) => ({
      kidName: profileNameMap.get(r.profile_id) || "Unknown",
      rewardName: r.reward_name || "Reward",
      icon: r.reward_icon || "🎁",
    }));
  const fulfilledRewards = (rewardPurchases as any[] || [])
    .filter((r: any) => r.status === "fulfilled")
    .map((r: any) => ({
      kidName: profileNameMap.get(r.profile_id) || "Unknown",
      rewardName: r.reward_name || "Reward",
      icon: r.reward_icon || "🎁",
    }));

  // P4: Build savings goals progress from preferences
  const savingsGoals: DigestContent["savingsGoals"] = [];
  for (const m of childMembers) {
    const goals = (m.preferences as any)?.apps?.choregami?.goals || [];
    for (const g of goals) {
      if (!g.isAchieved) {
        const percent = g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
        savingsGoals.push({
          kidName: m.name,
          goalName: g.name,
          icon: g.icon || "🎯",
          current: g.currentAmount || 0,
          target: g.targetAmount,
          percent,
        });
      }
    }
  }

  // P2: Payouts this week
  const payoutsThisWeek = (payoutTransactions as any[] || []).map((p: any) => ({
    kidName: profileNameMap.get(p.profile_id) || "Unknown",
    amount: Math.abs(p.points_change) * dollarValuePerPoint,
  }));

  // Generate insights with P1-P4 data
  const rewardsThisWeek = { pending: pendingRewards, fulfilled: fulfilledRewards };
  const behavioralInsightsData = { trendDirection, avgConsistency, totalActiveDays, topPerformer };
  insights = generateInsights({
    stats: { choresCompleted, choresTotal, prevWeekCompleted, prevWeekTotal },
    leaderboard,
    goalProgress,
    behavioralInsights: behavioralInsightsData,
    rewardsThisWeek,
    savingsGoals,
  });

  return {
    familyName: (family as any)?.name || "Your Family",
    parentName: profile.name,
    events: (events as any[] || []).map((e: any) => ({
      date: e.event_date,
      title: e.title,
      time: e.schedule_data?.start_time || undefined,
      emoji: e.metadata?.emoji || undefined,
    })),
    stats: {
      choresCompleted,
      choresTotal,
      prevWeekCompleted,
      prevWeekTotal,
      topEarner,
    },
    leaderboard,
    weeklyEarnings,
    goalProgress,
    insights,
    // P1-P4: Financial education features
    behavioralInsights: {
      trendDirection,
      avgConsistency,
      totalActiveDays,
      topPerformer,
    },
    balances,
    rewardsThisWeek: {
      pending: pendingRewards,
      fulfilled: fulfilledRewards,
    },
    savingsGoals,
    payoutsThisWeek,
    dollarValuePerPoint,
  };
}

/**
 * Send digest via Resend email.
 */
async function sendEmailDigest(
  toEmail: string,
  content: DigestContent,
): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[digest] RESEND_API_KEY not set");
    return false;
  }

  const resend = new Resend(apiKey);
  const html = buildEmailHtml(content);

  try {
    const { error } = await resend.emails.send({
      from: "ChoreGami <noreply@choregami.com>",
      to: toEmail,
      subject: `Your Family Scorecard — ${content.familyName}`,
      html,
    });

    if (error) {
      console.error("[digest] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[digest] Email send failed:", err);
    return false;
  }
}

/**
 * Send digest via Twilio SMS.
 */
async function sendSmsDigest(
  toPhone: string,
  content: DigestContent,
): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromPhone) {
    console.error("[digest] Twilio credentials not set");
    return false;
  }

  const smsBody = buildSmsBody(content);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        },
        body: new URLSearchParams({
          From: fromPhone,
          To: toPhone,
          Body: smsBody,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[digest] Twilio error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[digest] SMS send failed:", err);
    return false;
  }
}

function buildEmailHtml(content: DigestContent): string {
  const statsPercent = content.stats.choresTotal > 0
    ? Math.round((content.stats.choresCompleted / content.stats.choresTotal) * 100)
    : 0;

  // Week-over-week delta
  let deltaHtml = "";
  if (content.stats.prevWeekTotal > 0 && content.stats.choresTotal > 0) {
    const prevPercent = Math.round((content.stats.prevWeekCompleted / content.stats.prevWeekTotal) * 100);
    const delta = statsPercent - prevPercent;
    if (delta > 0) {
      deltaHtml = `<p style="margin:4px 0;color:#10b981;">Up ${delta}% from last week!</p>`;
    } else if (delta < 0) {
      deltaHtml = `<p style="margin:4px 0;color:#f59e0b;">Down ${Math.abs(delta)}% from last week</p>`;
    } else {
      deltaHtml = `<p style="margin:4px 0;color:#666;">Same as last week</p>`;
    }
  }

  // P1: Behavioral Insights section (MOST IMPORTANT - shows first!)
  const bi = content.behavioralInsights;
  const trendColor = bi.trendDirection === "improving" ? "#10b981" : bi.trendDirection === "declining" ? "#f59e0b" : "#666";
  const trendLabel = bi.trendDirection === "improving" ? "Trending Up!" : bi.trendDirection === "declining" ? "Needs Attention" : "Holding Steady";
  const topPerformerHtml = bi.topPerformer
    ? `<p style="margin:4px 0;"><strong>${bi.topPerformer.name}</strong> leads with ${bi.topPerformer.consistency}% consistency</p>`
    : "";
  const behavioralInsightsHtml = `
  <div class="section" style="background:#f0fdf4;border-left:4px solid #10b981;">
    <h2 style="color:#10b981;">Behavioral Insights</h2>
    <p style="margin:8px 0;font-size:1.15em;font-weight:600;color:${trendColor};">${trendLabel}</p>
    <p style="margin:4px 0;">Family consistency: <strong>${bi.avgConsistency}%</strong> over last 30 days</p>
    <p style="margin:4px 0;">Active days this month: <strong>${bi.totalActiveDays}</strong></p>
    ${topPerformerHtml}
  </div>`;

  // P2: Kid Balances section
  let balancesHtml = "";
  if (content.balances.length > 0) {
    const balanceRows = content.balances.map(b =>
      `<tr><td style="padding:4px 8px;">${b.name}</td><td style="padding:4px 8px;text-align:right;font-weight:600;">${b.points} pts</td><td style="padding:4px 8px;text-align:right;color:#10b981;">$${b.dollars.toFixed(2)}</td></tr>`
    ).join("");
    balancesHtml = `
  <div class="section">
    <h2>Kid Balances</h2>
    <table style="width:100%;">${balanceRows}</table>
  </div>`;
  }

  // P3: Rewards This Week section
  let rewardsHtml = "";
  const pendingCount = content.rewardsThisWeek.pending.length;
  const fulfilledCount = content.rewardsThisWeek.fulfilled.length;
  if (pendingCount > 0 || fulfilledCount > 0) {
    const pendingHtml = pendingCount > 0
      ? `<p style="margin:4px 0;color:#f59e0b;"><strong>${pendingCount} pending</strong>: ${content.rewardsThisWeek.pending.map(r => `${r.rewardName} (${r.kidName})`).join(", ")}</p>`
      : "";
    const fulfilledHtml = fulfilledCount > 0
      ? `<p style="margin:4px 0;color:#10b981;"><strong>${fulfilledCount} given</strong>: ${content.rewardsThisWeek.fulfilled.map(r => `${r.rewardName} (${r.kidName})`).join(", ")}</p>`
      : "";
    rewardsHtml = `
  <div class="section">
    <h2>Rewards This Week</h2>
    ${pendingHtml}
    ${fulfilledHtml}
  </div>`;
  }

  // P4: Savings Goals section
  let goalsHtml = "";
  if (content.savingsGoals.length > 0) {
    const goalRows = content.savingsGoals.map(g => {
      const barColor = g.percent >= 75 ? "#10b981" : g.percent >= 50 ? "#3b82f6" : "#f59e0b";
      return `
      <div style="margin:8px 0;">
        <p style="margin:2px 0;"><strong>${g.goalName}</strong> (${g.kidName})</p>
        <div style="background:#e5e7eb;border-radius:4px;height:10px;margin:4px 0;">
          <div style="background:${barColor};border-radius:4px;height:10px;width:${g.percent}%;"></div>
        </div>
        <p style="margin:2px 0;font-size:0.85em;color:#666;">$${g.current} / $${g.target} (${g.percent}%)</p>
      </div>`;
    }).join("");
    goalsHtml = `
  <div class="section">
    <h2>Savings Goals</h2>
    ${goalRows}
  </div>`;
  }

  // P2: Payouts This Week
  let payoutsHtml = "";
  if (content.payoutsThisWeek.length > 0) {
    const totalPayout = content.payoutsThisWeek.reduce((sum, p) => sum + p.amount, 0);
    const payoutList = content.payoutsThisWeek.map(p => `${p.kidName}: $${p.amount.toFixed(2)}`).join(", ");
    payoutsHtml = `
  <div class="section" style="background:#fef3c7;">
    <h2 style="color:#d97706;">Payouts This Week</h2>
    <p style="margin:4px 0;font-size:1.05em;">Total: <strong>$${totalPayout.toFixed(2)}</strong></p>
    <p style="margin:4px 0;color:#666;">${payoutList}</p>
  </div>`;
  }

  // Leaderboard rows
  const leaderboardHtml = content.leaderboard.length > 0
    ? content.leaderboard.map((m, i) => {
      const rank = `${i + 1}.`;
      const streakStr = m.streak > 0 ? `<span style="color:#f59e0b;">${m.streak}d streak</span>` : "";
      const consistencyStr = m.consistency > 0 ? `<span style="color:#10b981;font-size:0.8em;">${m.consistency}%</span>` : "";
      const weeklyStr = m.weeklyPoints > 0 ? `<span style="color:#888;font-size:0.85em;">(+${m.weeklyPoints} this week)</span>` : "";
      return `<tr>
        <td style="padding:6px 8px;font-size:1.1em;">${rank}</td>
        <td style="padding:6px 8px;font-weight:600;">${m.name}</td>
        <td style="padding:6px 8px;text-align:right;">${m.totalPoints} pts ${weeklyStr}</td>
        <td style="padding:6px 8px;text-align:right;">${streakStr} ${consistencyStr}</td>
      </tr>`;
    }).join("")
    : `<tr><td style="padding:8px;color:#888;">No activity yet</td></tr>`;

  // Goal progress
  let goalHtml = "";
  if (content.goalProgress) {
    const gp = content.goalProgress;
    const goalPercent = gp.target > 0 ? Math.min(100, Math.round((gp.current / gp.target) * 100)) : 0;
    const barColor = gp.achieved ? "#10b981" : "#3b82f6";
    const statusText = gp.achieved
      ? `<span style="color:#10b981;font-weight:600;">Reached! +$${gp.bonus} bonus each!</span>`
      : `$${gp.current} / $${gp.target} (${goalPercent}%)`;
    goalHtml = `
  <div class="section">
    <h2>Family Goal</h2>
    <div style="background:#e5e7eb;border-radius:4px;height:12px;margin:8px 0;">
      <div style="background:${barColor};border-radius:4px;height:12px;width:${goalPercent}%;"></div>
    </div>
    <p style="margin:4px 0;">${statusText}</p>
  </div>`;
  }

  // Events
  const eventsHtml = content.events.length > 0
    ? content.events.map((e) => {
      const date = new Date(e.date + "T00:00:00");
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = e.time ? ` at ${formatTime12(e.time)}` : "";
      return `<tr><td style="padding:4px 8px;color:#666;">${dateStr}</td><td style="padding:4px 8px;">${e.title}${timeStr}</td></tr>`;
    }).join("")
    : `<tr><td style="padding:8px;color:#888;">No events this week — enjoy the break!</td></tr>`;

  // Insights
  const insightsHtml = content.insights.length > 0
    ? content.insights.map((i) => `<p style="margin:4px 0;">${i}</p>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 0 auto; padding: 20px; }
  h2 { color: #10b981; margin: 0 0 8px 0; font-size: 1rem; }
  .section { margin: 16px 0; padding: 16px; background: #f8fffe; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; }
  .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; }
</style></head>
<body>
<div class="container">
  <h1 style="color:#10b981;text-align:center;margin-bottom:4px;">Family Scorecard</h1>
  <p style="text-align:center;color:#666;margin-top:0;">Hi ${content.parentName}! Here's your family's weekly scorecard.</p>

  ${behavioralInsightsHtml}

  <div class="section">
    <h2>Weekly Scorecard</h2>
    <p style="margin:4px 0;font-size:1.1em;font-weight:600;">${content.stats.choresCompleted}/${content.stats.choresTotal} chores completed (${statsPercent}%)</p>
    ${deltaHtml}
    ${content.weeklyEarnings > 0 ? `<p style="margin:4px 0;">${content.weeklyEarnings} pts earned this week</p>` : ""}
  </div>

  <div class="section">
    <h2>Family Leaderboard</h2>
    <table>${leaderboardHtml}</table>
  </div>

  ${content.stats.topEarner ? `
  <div class="section">
    <h2>Top Earner This Week</h2>
    <p style="margin:4px 0;font-size:1.05em;">${content.stats.topEarner.name} earned <strong>${content.stats.topEarner.points} pts</strong> this week!</p>
  </div>` : ""}

  ${balancesHtml}

  ${rewardsHtml}

  ${goalsHtml}

  ${payoutsHtml}

  ${goalHtml}

  <div class="section">
    <h2>Upcoming Events</h2>
    <table>${eventsHtml}</table>
  </div>

  ${insightsHtml ? `
  <div class="section" style="background:#fffbeb;">
    <h2 style="color:#f59e0b;">Insights</h2>
    ${insightsHtml}
  </div>` : ""}

  <div class="footer">
    <p>You're receiving this because weekly digests are enabled.<br/>Manage in Settings → Notifications.</p>
    <p>ChoreGami — Building Better Family Habits, One Chore at a Time</p>
  </div>
</div>
</body>
</html>`;
}

function buildSmsBody(content: DigestContent): string {
  const statsPercent = content.stats.choresTotal > 0
    ? Math.round((content.stats.choresCompleted / content.stats.choresTotal) * 100)
    : 0;

  let body = `${content.familyName} Scorecard\n\n`;

  // P1: Behavioral Insights (MOST IMPORTANT - first in SMS too!)
  const bi = content.behavioralInsights;
  const trendLabel = bi.trendDirection === "improving" ? "UP" : bi.trendDirection === "declining" ? "DOWN" : "STEADY";
  body += `${trendLabel}: ${bi.avgConsistency}% consistency`;
  if (bi.topPerformer) {
    body += ` (Top: ${bi.topPerformer.name})`;
  }
  body += "\n";

  body += `${content.stats.choresCompleted}/${content.stats.choresTotal} chores (${statsPercent}%)`;

  // Week-over-week
  if (content.stats.prevWeekTotal > 0 && content.stats.choresTotal > 0) {
    const prevPercent = Math.round((content.stats.prevWeekCompleted / content.stats.prevWeekTotal) * 100);
    const delta = statsPercent - prevPercent;
    if (delta > 0) body += ` +${delta}%`;
    else if (delta < 0) body += ` -${Math.abs(delta)}%`;
  }

  // Leaderboard (top 3)
  body += "\n";
  content.leaderboard.slice(0, 3).forEach((m, i) => {
    const streakStr = m.streak > 0 ? ` ${m.streak}d streak` : "";
    const consistencyStr = m.consistency > 0 ? ` ${m.consistency}%` : "";
    body += `\n${i + 1}. ${m.name} ${m.totalPoints}pts${streakStr}${consistencyStr}`;
  });

  // P2: Balances (condensed)
  if (content.balances.length > 0) {
    const totalBalance = content.balances.reduce((s, b) => s + b.dollars, 0);
    body += `\nTotal balance: $${totalBalance.toFixed(2)}`;
  }

  // P3: Rewards summary
  const pendingCount = content.rewardsThisWeek.pending.length;
  if (pendingCount > 0) {
    body += `\n${pendingCount} reward${pendingCount > 1 ? "s" : ""} pending`;
  }

  // P4: Goals summary
  if (content.savingsGoals.length > 0) {
    const nearGoals = content.savingsGoals.filter(g => g.percent >= 75);
    if (nearGoals.length > 0) {
      body += `\n${nearGoals.length} goal${nearGoals.length > 1 ? "s" : ""} almost reached!`;
    }
  }

  // P2: Payouts
  if (content.payoutsThisWeek.length > 0) {
    const totalPayout = content.payoutsThisWeek.reduce((s, p) => s + p.amount, 0);
    body += `\n$${totalPayout.toFixed(2)} paid out`;
  }

  // Weekly earnings
  if (content.weeklyEarnings > 0) {
    body += `\n${content.weeklyEarnings}pts earned`;
  }

  // Goal
  if (content.goalProgress) {
    const gp = content.goalProgress;
    body += gp.achieved
      ? `\nGoal reached! +$${gp.bonus} bonus`
      : `\nGoal: $${gp.current}/$${gp.target}`;
  }

  // Events (top 2 for SMS to save space)
  if (content.events.length > 0) {
    body += "\n";
    content.events.slice(0, 2).forEach((e) => {
      const date = new Date(e.date + "T00:00:00");
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
      const timeStr = e.time ? ` ${formatTime12(e.time)}` : "";
      body += `\n${day}: ${e.title}${timeStr}`;
    });
  }

  return body;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Get last Sunday 5pm UTC (= 9am PST) for idempotency check.
 * Note: During PDT (summer), this corresponds to 10am Pacific.
 */
function getLastSunday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day; // days since last Sunday
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - diff);
  lastSunday.setUTCHours(17, 0, 0, 0); // 5pm UTC = 9am PST
  // If it's Sunday but before 5pm UTC, go back to previous Sunday
  if (day === 0 && now.getUTCHours() < 17) {
    lastSunday.setUTCDate(lastSunday.getUTCDate() - 7);
  }
  return lastSunday;
}

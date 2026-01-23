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
    topEarner?: { name: string; points: number };
    longestStreak?: { name: string; days: number };
  };
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

      const hasRealEmail = user.email && !user.email.endsWith("@phone.choregami.local");
      const hasPhone = !!user.phone;
      let channel = notifPrefs.digest_channel || (hasRealEmail ? "email" : "sms");

      // SMS gate: check monthly limit, auto-fallback to email
      if (channel === "sms") {
        const tier = (profile as any).subscription?.tier || "free";
        const limit = FEATURE_LIMITS[tier as keyof typeof FEATURE_LIMITS]?.sms_per_month ?? FEATURE_LIMITS.free.sms_per_month;
        const monthlyUsage = getMonthlyUsage(profile, "digests");

        if (monthlyUsage >= limit) {
          console.log(`[digest] [${profile.name}] SMS limit reached (${monthlyUsage}/${limit}). Falling back to email.`);
          if (hasRealEmail) {
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
      if (channel === "email" && hasRealEmail) {
        sendSuccess = await sendEmailDigest(user.email!, content);
      } else if (channel === "sms" && hasPhone) {
        sendSuccess = await sendSmsDigest(user.phone!, content);
      } else if (hasRealEmail) {
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
 * Build digest content for a parent profile.
 */
async function buildDigestContent(
  supabase: any,
  profile: { id: string; name: string; family_id: string },
): Promise<DigestContent> {
  // Get family name
  const { data: family } = await supabase
    .from("families")
    .select("name")
    .eq("id", profile.family_id)
    .single();

  // Get upcoming events (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("family_events")
    .select("title, event_date, schedule_data, metadata")
    .eq("family_id", profile.family_id)
    .gte("event_date", todayStr)
    .lte("event_date", nextWeekStr)
    .order("event_date", { ascending: true })
    .limit(10);

  // Get last week's chore stats
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const { data: transactions } = await supabase
    .from("chore_transactions")
    .select("profile_id, points_change, transaction_type")
    .eq("family_id", profile.family_id)
    .eq("transaction_type", "chore_completed")
    .gte("created_at", lastWeekStart.toISOString());

  const { data: assignments } = await supabase
    .from("chore_assignments")
    .select("id")
    .eq("family_id", profile.family_id)
    .gte("assigned_date", lastWeekStart.toISOString().slice(0, 10))
    .lte("assigned_date", todayStr);

  // Calculate top earner
  const earnerMap = new Map<string, number>();
  (transactions as any[] || []).forEach((t: any) => {
    earnerMap.set(t.profile_id, (earnerMap.get(t.profile_id) || 0) + t.points_change);
  });

  let topEarner: { name: string; points: number } | undefined;
  if (earnerMap.size > 0) {
    const [topId, topPts] = [...earnerMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const { data: topProfile } = await supabase
      .from("family_profiles")
      .select("name")
      .eq("id", topId)
      .single();
    if (topProfile) {
      topEarner = { name: (topProfile as any).name, points: topPts };
    }
  }

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
      choresCompleted: (transactions as any[] || []).length,
      choresTotal: (assignments as any[] || []).length,
      topEarner,
    },
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
      subject: `📅 Week Ahead for the ${content.familyName} Family`,
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
  const eventsHtml = content.events.length > 0
    ? content.events.map((e) => {
      const date = new Date(e.date + "T00:00:00");
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = e.time ? ` at ${formatTime12(e.time)}` : "";
      return `<tr><td style="padding:4px 8px;color:#666;">${dateStr}</td><td style="padding:4px 8px;">${e.emoji || ""} ${e.title}${timeStr}</td></tr>`;
    }).join("")
    : `<tr><td style="padding:8px;color:#888;">No events this week — enjoy the break!</td></tr>`;

  const statsPercent = content.stats.choresTotal > 0
    ? Math.round((content.stats.choresCompleted / content.stats.choresTotal) * 100)
    : 0;

  return `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 0 auto; padding: 20px; }
  h2 { color: #10b981; margin: 0 0 4px 0; font-size: 1rem; }
  .section { margin: 20px 0; padding: 16px; background: #f8fffe; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; }
  .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; }
</style></head>
<body>
<div class="container">
  <h1 style="color:#10b981;text-align:center;margin-bottom:4px;">📅 Week Ahead</h1>
  <p style="text-align:center;color:#666;margin-top:0;">Hi ${content.parentName}! Here's your family's week at a glance.</p>

  <div class="section">
    <h2>📅 This Week's Events</h2>
    <table>${eventsHtml}</table>
  </div>

  <div class="section">
    <h2>📊 Last Week's Highlights</h2>
    <p style="margin:4px 0;">✅ Chores completed: ${content.stats.choresCompleted}/${content.stats.choresTotal} (${statsPercent}%)</p>
    ${content.stats.topEarner ? `<p style="margin:4px 0;">⭐ Top earner: ${content.stats.topEarner.name} (${content.stats.topEarner.points} pts)</p>` : ""}
  </div>

  <div class="footer">
    <p>You're receiving this because weekly digests are enabled.<br/>Manage in Settings → Notifications.</p>
    <p>ChoreGami — Making chores fun for families</p>
  </div>
</div>
</body>
</html>`;
}

function buildSmsBody(content: DigestContent): string {
  let body = `📅 ${content.familyName} Week Ahead\n\n`;

  if (content.events.length > 0) {
    content.events.slice(0, 5).forEach((e) => {
      const date = new Date(e.date + "T00:00:00");
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
      const timeStr = e.time ? ` ${formatTime12(e.time)}` : "";
      body += `${day}: ${e.emoji || ""} ${e.title}${timeStr}\n`;
    });
  } else {
    body += "No events this week!\n";
  }

  body += `\n📊 Chores: ${content.stats.choresCompleted}/${content.stats.choresTotal}`;
  if (content.stats.topEarner) {
    body += `\n⭐ Top: ${content.stats.topEarner.name} (${content.stats.topEarner.points}pts)`;
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
 * Get last Sunday 6am UTC (= 9am EAT) for idempotency check.
 */
function getLastSunday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day; // days since last Sunday
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - diff);
  lastSunday.setUTCHours(6, 0, 0, 0); // 6am UTC = 9am EAT
  // If it's Sunday but before 6am UTC, go back to previous Sunday
  if (day === 0 && now.getUTCHours() < 6) {
    lastSunday.setUTCDate(lastSunday.getUTCDate() - 7);
  }
  return lastSunday;
}

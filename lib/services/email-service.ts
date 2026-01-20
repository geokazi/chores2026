/**
 * Email Service - Resend Integration
 * Sends transactional emails for ChoreGami events
 */

import { Resend } from "npm:resend";
import { createClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors (env vars not available during docker build)
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const EMAIL_FROM = "Choregami Support <noreply@choregami.com>";

interface GoalAchievedEmailData {
  familyName: string;
  goalAmount: number;
  bonusAmount: number;
  memberNames: string[];
}

/**
 * Get parent emails for a family (only parents with linked user accounts)
 */
export async function getParentEmails(familyId: string): Promise<string[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get parent user_ids
  const { data: parents, error: parentError } = await supabase
    .from("family_profiles")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("role", "parent")
    .not("user_id", "is", null);

  if (parentError || !parents?.length) {
    console.log("No parents with user_id found for family:", familyId);
    return [];
  }

  const userIds = parents.map(p => p.user_id).filter(Boolean);

  // Get emails from auth.users via admin API
  const emails: string[] = [];
  for (const userId of userIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.email) {
      emails.push(userData.user.email);
    }
  }

  return emails;
}

/**
 * Send goal achieved celebration email to parents
 */
export async function sendGoalAchievedEmail(
  toEmails: string[],
  data: GoalAchievedEmailData
): Promise<{ success: boolean; error?: string }> {
  if (toEmails.length === 0) {
    return { success: false, error: "No recipient emails provided" };
  }

  try {
    const { data: result, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: toEmails,
      subject: `🎉 ${data.familyName} hit the weekly goal!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .emoji { font-size: 48px; }
            h1 { color: #10b981; margin: 10px 0; }
            .highlight { background: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .bonus { color: #10b981; font-weight: bold; font-size: 1.2em; }
            ul { padding-left: 20px; }
            li { margin: 5px 0; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Weekly Goal Achieved!</h1>
            </div>

            <p>Great news! <strong>${data.familyName}</strong> earned <strong>$${data.goalAmount}</strong> this week and hit the family goal!</p>

            <div class="highlight">
              <p style="margin: 0;">Everyone gets a bonus of <span class="bonus">+$${data.bonusAmount}</span>!</p>
            </div>

            <p>Family members who earned the bonus:</p>
            <ul>
              ${data.memberNames.map(name => `<li>${name}</li>`).join("")}
            </ul>

            <p>Keep up the great teamwork! 💪</p>

            <div class="footer">
              <p>Sent from ChoreGami - Making chores fun for families</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Goal achieved email sent:", result);
    return { success: true };
  } catch (err) {
    console.error("❌ Email send failed:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Send welcome email to newly registered users
 */
export async function sendWelcomeEmail(
  toEmail: string,
  setupUrl: string
): Promise<{ success: boolean; error?: string }> {
  console.log("📧 sendWelcomeEmail called for:", toEmail);

  try {
    const resend = getResend();
    console.log("📧 Resend client initialized, sending to:", toEmail);

    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Welcome to ChoreGami! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .emoji { font-size: 48px; }
            h1 { color: #10b981; margin: 10px 0; }
            .cta-button {
              display: inline-block;
              background: #10b981;
              color: white !important;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 20px 0;
            }
            .cta-container { text-align: center; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Welcome to ChoreGami!</h1>
            </div>

            <p>Thanks for signing up! You're one step away from making family chores fun and rewarding.</p>

            <p>Here's what you can do with ChoreGami:</p>
            <ul>
              <li>Create chore schedules for your kids</li>
              <li>Track completions and award points</li>
              <li>Set family goals and bonuses</li>
              <li>Make chores into a fun game!</li>
            </ul>

            <div class="cta-container">
              <a href="${setupUrl}" class="cta-button">Complete Your Setup</a>
            </div>

            <p style="color: #666; font-size: 14px;">If you didn't create this account, you can ignore this email.</p>

            <div class="footer">
              <p>ChoreGami - Making chores fun for families</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("❌ Resend welcome email error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Welcome email sent to:", toEmail, result);
    return { success: true };
  } catch (err) {
    console.error("❌ Welcome email send failed:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Notify parents when family goal is achieved (convenience wrapper)
 */
export async function notifyGoalAchieved(
  familyId: string,
  familyName: string,
  goalAmount: number,
  bonusAmount: number,
  memberNames: string[]
): Promise<void> {
  try {
    const emails = await getParentEmails(familyId);

    if (emails.length === 0) {
      console.log("⚠️ No parent emails found for goal notification");
      return;
    }

    console.log(`📧 Sending goal achieved email to: ${emails.join(", ")}`);

    const result = await sendGoalAchievedEmail(emails, {
      familyName,
      goalAmount,
      bonusAmount,
      memberNames,
    });

    if (!result.success) {
      console.warn("⚠️ Goal email failed (non-critical):", result.error);
    }
  } catch (err) {
    // Non-blocking - don't fail the main operation
    console.warn("⚠️ Goal notification failed (non-critical):", err);
  }
}

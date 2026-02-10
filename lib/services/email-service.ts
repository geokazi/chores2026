/**
 * Email Service - Resend Integration
 * Sends transactional emails for ChoreGami events
 */

import { Resend } from "npm:resend";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// ============================================================================
// Gift Code Email Functions
// ============================================================================

interface GiftEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  giftCode: string;
  planType: string;
  planDuration: string;
  personalMessage?: string;
}

const PLAN_DETAILS: Record<string, { name: string; duration: string; value: string }> = {
  month_pass: { name: "Trial Pass", duration: "1 month", value: "$4.99" },
  trial: { name: "Trial Pass", duration: "1 month", value: "$4.99" },
  summer: { name: "Summer Pass", duration: "3 months", value: "$14.99" },
  school_year: { name: "School Year Pass", duration: "6 months", value: "$29.99" },
  full_year: { name: "Full Year Pass", duration: "12 months", value: "$49.99" },
};

/**
 * Send gift code email to recipient
 */
export async function sendGiftCodeEmail(data: GiftEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const planInfo = PLAN_DETAILS[data.planType] || {
    name: data.planType,
    duration: data.planDuration,
    value: ""
  };

  const recipientGreeting = data.recipientName
    ? `Hi ${data.recipientName},`
    : "Hi there,";

  const personalMessageHtml = data.personalMessage
    ? `<div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
         <p style="margin: 0; font-style: italic; color: #064e3b;">"${data.personalMessage}"</p>
         <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">— ${data.senderName}</p>
       </div>`
    : "";

  try {
    const { data: result, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: data.recipientEmail,
      subject: `🎁 ${data.senderName} sent you a ChoreGami gift!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🎁 You've Received a Gift!</h1>
          </div>

          <p>${recipientGreeting}</p>

          <p><strong>${data.senderName}</strong> has sent you a ChoreGami gift — a family chore management app that makes household tasks fun and rewarding!</p>

          ${personalMessageHtml}

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">Your Gift Code</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${data.giftCode}</p>
            <p style="margin: 16px 0 0 0; font-size: 14px; opacity: 0.9;">${planInfo.name} (${planInfo.duration})</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="https://choregami.app/redeem?code=${encodeURIComponent(data.giftCode)}"
               style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Redeem Your Gift
            </a>
          </div>

          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #064e3b;">What You'll Get:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li>Assign chores to family members with point rewards</li>
              <li>Real-time leaderboards and friendly competition</li>
              <li>Event planning with prep task checklists</li>
              <li>Weekly progress reports and insights</li>
              <li>Works on any device — phones, tablets, computers</li>
            </ul>
          </div>

          <p style="color: #666; font-size: 14px;">
            To redeem, simply click the button above or visit <a href="https://choregami.app/redeem" style="color: #10b981;">choregami.app/redeem</a> and enter your code.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            ChoreGami — Transform chores into family victories<br>
            <a href="https://choregami.app" style="color: #10b981;">choregami.app</a>
          </p>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("❌ Resend gift email error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Gift email sent to ${data.recipientEmail}, messageId: ${result?.id}`);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error("❌ Gift email send failed:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

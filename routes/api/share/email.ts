/**
 * Share via Email API
 * POST /api/share/email - Send styled referral email via Resend
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { Resend } from "npm:resend";

interface ShareEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  shareUrl: string;
  familyName: string;
  stats?: {
    choresCompleted: number;
    streakDays: number;
    eventsPlanned: number;
  };
}

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family || !session.user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: ShareEmailRequest;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { recipientEmail, recipientName, shareUrl, familyName, stats } = body;

    // Validate email
    if (!recipientEmail || !recipientEmail.includes("@") || recipientEmail.length < 5) {
      return Response.json({ success: false, error: "Valid email required" }, { status: 400 });
    }

    // Validate share URL
    if (!shareUrl || !shareUrl.includes("/r/")) {
      return Response.json({ success: false, error: "Invalid share URL" }, { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("[share/email] RESEND_API_KEY not set");
      return Response.json({ success: false, error: "Email service unavailable" }, { status: 503 });
    }

    const resend = new Resend(apiKey);
    const greeting = recipientName?.trim() ? `Hey ${recipientName.trim()}!` : "Hey there!";

    // Build personalized message based on stats
    const personalizedMessage = buildPersonalizedMessage(stats);

    try {
      const { error } = await resend.emails.send({
        from: "ChoreGami <noreply@choregami.com>",
        to: recipientEmail.toLowerCase().trim(),
        subject: `${familyName} thinks you'd like ChoreGami`,
        html: buildEmailHtml({ greeting, personalizedMessage, familyName, shareUrl, stats }),
      });

      if (error) {
        console.error("[share/email] Resend error:", error);
        return Response.json({ success: false, error: "Failed to send email" }, { status: 500 });
      }

      // Track for analytics
      fetch("/api/analytics/feature-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: "referral_email_sent" }),
      }).catch(() => {});

      return Response.json({ success: true });
    } catch (err) {
      console.error("[share/email] Send failed:", err);
      return Response.json({ success: false, error: "Failed to send email" }, { status: 500 });
    }
  },
};

/** Build personalized message based on family stats */
function buildPersonalizedMessage(stats?: ShareEmailRequest["stats"]): string {
  if (!stats) {
    return "We stopped juggling apps. Chores, points, family events—one shared place. Works for real families.";
  }

  const { choresCompleted, streakDays, eventsPlanned } = stats;

  if (streakDays >= 5) {
    return `We've been using ChoreGami for ${streakDays} days straight and the kids actually do their chores now. Wild, I know.`;
  }
  if (eventsPlanned > 0 && choresCompleted >= 10) {
    return `Finally stopped juggling apps. ${choresCompleted} chores done this week, ${eventsPlanned} family events planned—one place for everything.`;
  }
  if (choresCompleted >= 10) {
    return `${choresCompleted} chores completed this week. Our family actually uses this app together. Thought you might like it.`;
  }
  if (eventsPlanned > 0 && choresCompleted > 0) {
    return `We track chores and family events in one app now. ${choresCompleted} chores done, ${eventsPlanned} events planned this week. Works surprisingly well.`;
  }
  if (choresCompleted > 0) {
    return `${choresCompleted} chores this week—we're actually using it. Thought of you.`;
  }

  return "We stopped juggling apps. Chores, points, family events—one shared place. Works for real families.";
}

/** Build styled HTML email */
function buildEmailHtml(params: {
  greeting: string;
  personalizedMessage: string;
  familyName: string;
  shareUrl: string;
  stats?: ShareEmailRequest["stats"];
}): string {
  const { greeting, personalizedMessage, familyName, shareUrl, stats } = params;

  // Build stats line if available
  let statsLine = "";
  if (stats && (stats.choresCompleted > 0 || stats.eventsPlanned > 0)) {
    const parts: string[] = [];
    if (stats.choresCompleted > 0) parts.push(`${stats.choresCompleted} chores`);
    if (stats.streakDays >= 3) parts.push(`${stats.streakDays}-day streak`);
    if (stats.eventsPlanned > 0) parts.push(`${stats.eventsPlanned} events`);
    if (parts.length > 0) {
      statsLine = `<p style="font-size: 14px; color: #666; margin: 16px 0;">This week: ${parts.join(" · ")}</p>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; line-height: 1;">💛</div>
        <h1 style="color: #10b981; margin: 12px 0 0 0; font-size: 24px;">${greeting}</h1>
      </div>

      <!-- Quote box -->
      <div style="background: #fefce8; border-left: 4px solid #facc15; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-style: italic; color: #713f12;">
          "${personalizedMessage}"
        </p>
      </div>

      <!-- Main text -->
      <p style="margin: 20px 0; color: #333;">
        <strong>${familyName}</strong> thought you might like <strong style="color: #10b981;">ChoreGami</strong>—a simple app for managing family chores and events together.
      </p>

      ${statsLine}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${shareUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Check it out</a>
      </div>

      <!-- Incentive -->
      <p style="text-align: center; color: #666; font-size: 14px; margin: 20px 0;">
        🎉 If you join, you'll both get 1 free month!
      </p>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;">

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px;">
          <strong style="color: #10b981;">ChoreGami</strong> · <span style="color: #888;">Making family life easier</span>
        </p>
        <p style="margin: 0; font-size: 12px; color: #aaa;">
          © 2026 ChoreGami™ · All rights reserved · Built with ❤️ for busy families
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;
}

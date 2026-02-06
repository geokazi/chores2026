/**
 * Share via Email API
 * POST /api/share/email - Send referral link via email
 *
 * Reuses Resend from invite-service pattern.
 * Simple, focused endpoint - no new tables needed.
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { Resend } from "npm:resend";

interface ShareEmailRequest {
  email: string;
  name?: string;
  shareUrl: string;
  message: string;
  senderName: string;
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

    const { email, name, shareUrl, message, senderName } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@") || email.length < 5) {
      return Response.json({ success: false, error: "Valid email required" }, { status: 400 });
    }

    // Validate share URL (must be our domain)
    if (!shareUrl || !shareUrl.includes("/r/")) {
      return Response.json({ success: false, error: "Invalid share URL" }, { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("[share/email] RESEND_API_KEY not set");
      return Response.json({ success: false, error: "Email service unavailable" }, { status: 503 });
    }

    const resend = new Resend(apiKey);
    const recipientName = name?.trim() || "Friend";
    const fromName = senderName || "A friend";

    try {
      const { error } = await resend.emails.send({
        from: "ChoreGami <noreply@choregami.com>",
        to: email.toLowerCase().trim(),
        subject: `${fromName} thinks you'd like ChoreGami`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; }
              .logo { font-size: 2.5rem; }
              h1 { color: #10b981; margin: 10px 0; font-size: 1.5rem; }
              .message { background: #f0fdf4; padding: 16px; border-radius: 12px; margin: 20px 0; font-style: italic; color: #064e3b; }
              .cta-button { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
              .cta-container { text-align: center; }
              .bonus { text-align: center; color: #666; font-size: 14px; margin: 16px 0; }
              .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">💛</div>
                <h1>Hey ${recipientName}!</h1>
              </div>
              <div class="message">
                "${message}"
              </div>
              <p><strong>${fromName}</strong> thought you might like ChoreGami—a simple app for managing family chores and events together.</p>
              <div class="cta-container">
                <a href="${shareUrl}" class="cta-button">Check it out</a>
              </div>
              <p class="bonus">🎉 If you join, you'll both get 1 free month!</p>
              <div class="footer">
                <p>ChoreGami - Making family life easier</p>
              </div>
            </div>
          </body>
          </html>
        `,
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

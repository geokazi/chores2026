/**
 * Invite Service - Family Member Invites
 *
 * Handles dual-channel (email/phone) invites for co-parents.
 * Uses JSONB storage in families.settings - no new tables needed.
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend";

export interface PendingInvite {
  token: string;
  channel: "email" | "phone";
  contact: string;
  role: "parent";
  name?: string;
  invited_by: string;
  invited_by_name: string;
  invited_at: string;
  expires_at: string;
}

export interface InviteResult {
  success: boolean;
  error?: string;
  invite?: PendingInvite;
}

export class InviteService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }

  /** Generate 40-char secure token */
  generateToken(): string {
    return crypto.randomUUID().replace(/-/g, "") +
           crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }

  /** Normalize phone to E.164 format */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
  }

  /** Create invite and store in JSONB */
  async createInvite(
    familyId: string,
    channel: "email" | "phone",
    contact: string,
    invitedBy: string,
    invitedByName: string,
    name?: string
  ): Promise<InviteResult> {
    // Normalize contact
    const normalizedContact = channel === "phone"
      ? this.normalizePhone(contact)
      : contact.toLowerCase().trim();

    // Check pending invite limit (max 5)
    const { data: countData } = await this.supabase.rpc("count_pending_invites", {
      p_family_id: familyId
    });
    if ((countData ?? 0) >= 5) {
      return { success: false, error: "Maximum 5 pending invites allowed" };
    }

    // Check if contact already invited or in family
    const existing = await this.checkExistingMember(familyId, channel, normalizedContact);
    if (existing) {
      return { success: false, error: existing };
    }

    const invite: PendingInvite = {
      token: this.generateToken(),
      channel,
      contact: normalizedContact,
      role: "parent",
      name,
      invited_by: invitedBy,
      invited_by_name: invitedByName,
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Store in JSONB
    const { error } = await this.supabase.rpc("append_pending_invite", {
      p_family_id: familyId,
      p_invite: invite,
    });

    if (error) {
      console.error("[invite] JSONB append error:", error);
      return { success: false, error: "Failed to create invite" };
    }

    return { success: true, invite };
  }

  /** Check if contact is already a member or has pending invite */
  private async checkExistingMember(
    familyId: string,
    channel: "email" | "phone",
    contact: string
  ): Promise<string | null> {
    // Check pending invites
    const { data: family } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const pendingInvites = family?.settings?.apps?.choregami?.pending_invites || [];
    const alreadyInvited = pendingInvites.some((i: PendingInvite) =>
      i.contact === contact && new Date(i.expires_at) > new Date()
    );
    if (alreadyInvited) {
      return "This person already has a pending invite";
    }

    // Check existing family members (parents only have user_id)
    if (channel === "email") {
      const { data: profiles } = await this.supabase
        .from("family_profiles")
        .select("user_id")
        .eq("family_id", familyId)
        .eq("role", "parent")
        .eq("is_deleted", false)
        .not("user_id", "is", null);

      for (const profile of profiles || []) {
        const { data: user } = await this.supabase.auth.admin.getUserById(profile.user_id);
        if (user?.user?.email?.toLowerCase() === contact) {
          return "This person is already a family member";
        }
      }
    }

    return null;
  }

  /** Find invite by token - O(1) database operation via SQL function */
  async findByToken(token: string): Promise<{
    invite: PendingInvite;
    familyId: string;
    familyName: string;
  } | null> {
    const { data, error } = await this.supabase.rpc("find_invite_by_token", {
      p_token: token,
    });

    if (error) {
      console.error("[invite] Token lookup error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      invite: row.invite as PendingInvite,
      familyId: row.family_id,
      familyName: row.family_name,
    };
  }

  /** Accept invite: create profile, remove from pending */
  async acceptInvite(token: string, userId: string): Promise<InviteResult> {
    const found = await this.findByToken(token);
    if (!found) {
      return { success: false, error: "Invalid or expired invite" };
    }

    const { invite, familyId } = found;

    // Create parent profile
    const { error: profileError } = await this.supabase
      .from("family_profiles")
      .insert({
        family_id: familyId,
        user_id: userId,
        name: invite.name || "Parent",
        role: "parent",
        current_points: 0,
      });

    if (profileError) {
      console.error("[invite] Profile creation error:", profileError);
      return { success: false, error: "Failed to join family" };
    }

    // Remove from pending
    await this.supabase.rpc("remove_pending_invite", {
      p_family_id: familyId,
      p_token: token,
    });

    return { success: true };
  }

  /** Send invite via email (Resend) */
  async sendEmailInvite(invite: PendingInvite, familyName: string, baseUrl: string): Promise<boolean> {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("[invite] RESEND_API_KEY not set");
      return false;
    }

    const resend = new Resend(apiKey);
    const joinUrl = `${baseUrl}/join?token=${invite.token}`;

    try {
      const { error } = await resend.emails.send({
        from: "ChoreGami <noreply@choregami.com>",
        to: invite.contact,
        subject: `Join ${familyName} on ChoreGami`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; }
              h1 { color: #10b981; margin: 10px 0; }
              .cta-button { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
              .cta-container { text-align: center; }
              .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited!</h1>
              </div>
              <p><strong>${invite.invited_by_name}</strong> invited you to join the <strong>${familyName}</strong> family on ChoreGami.</p>
              <p>ChoreGami helps families manage chores together with points, rewards, and fun!</p>
              <div class="cta-container">
                <a href="${joinUrl}" class="cta-button">Join Family</a>
              </div>
              <p style="color: #666; font-size: 14px;">This invite expires in 7 days.</p>
              <div class="footer">
                <p>ChoreGami - Making chores fun for families</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("[invite] Resend error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[invite] Email send failed:", err);
      return false;
    }
  }

  /** Send invite via SMS (Twilio Messaging Service) */
  async sendSmsInvite(invite: PendingInvite, familyName: string, baseUrl: string): Promise<boolean> {
    // NOTE: SMS invites temporarily disabled - A2P 10DLC registration pending
    // The UI should prevent this from being called, but return false as safety
    console.warn("[invite] SMS invites temporarily disabled - A2P 10DLC pending");
    return false;

    /* Re-enable when A2P 10DLC campaign is approved:
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!accountSid || !authToken || !messagingServiceSid) {
      console.error("[invite] Twilio credentials not set (need TWILIO_MESSAGING_SERVICE_SID)");
      return false;
    }

    const joinUrl = `${baseUrl}/join?token=${invite.token}`;
    const body = `${invite.invited_by_name} invited you to ChoreGami! Join the ${familyName} family: ${joinUrl}`;

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
            MessagingServiceSid: messagingServiceSid,
            To: invite.contact,
            Body: body,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("[invite] Twilio error:", err);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[invite] SMS send failed:", err);
      return false;
    }
    */
  }
}

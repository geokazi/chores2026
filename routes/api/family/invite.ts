/**
 * Family Invite API
 *
 * POST /api/family/invite - Create and send invite (email or phone)
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { InviteService } from "../../../lib/services/invite-service.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family || !session.user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Only parents can invite
    if (session.user.role !== "parent") {
      return Response.json({ success: false, error: "Only parents can send invites" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { channel, contact, name, role } = body;

    // Validate role (default to parent)
    const inviteRole = role === "child" ? "child" : "parent";

    // Validate channel
    if (!channel || !["email", "phone"].includes(channel)) {
      return Response.json({ success: false, error: "Channel must be 'email' or 'phone'" }, { status: 400 });
    }

    // Validate contact
    if (!contact || typeof contact !== "string" || contact.trim().length < 3) {
      return Response.json({ success: false, error: "Valid contact required" }, { status: 400 });
    }

    // Basic email validation
    if (channel === "email" && !contact.includes("@")) {
      return Response.json({ success: false, error: "Invalid email address" }, { status: 400 });
    }

    // Basic phone validation (at least 10 digits)
    if (channel === "phone" && contact.replace(/\D/g, "").length < 10) {
      return Response.json({ success: false, error: "Invalid phone number" }, { status: 400 });
    }

    const inviteService = new InviteService();

    // Create invite
    const result = await inviteService.createInvite(
      session.family.id,
      channel,
      contact,
      session.user.profileId!,
      session.user.profileName || "A family member",
      name,
      inviteRole
    );

    if (!result.success || !result.invite) {
      return Response.json({ success: false, error: result.error }, { status: 400 });
    }

    // Get base URL from request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // DEBUG: Log join link for testing
    console.log("\n" + "=".repeat(60));
    console.log("🔗 DEBUG: Invite created - JOIN LINK:");
    console.log(`   ${baseUrl}/join?token=${result.invite.token}`);
    console.log(`   Role: ${inviteRole} | Contact: ${result.invite.contact}`);
    console.log("=".repeat(60) + "\n");

    // Send invite
    let sent = false;
    if (channel === "email") {
      sent = await inviteService.sendEmailInvite(result.invite, session.family.name, baseUrl);
    } else {
      sent = await inviteService.sendSmsInvite(result.invite, session.family.name, baseUrl);
    }

    if (!sent) {
      // Invite created but send failed - still return success with warning
      // Note: Don't expose token in response for security - it's only in email/SMS
      console.warn("[invite] Created but send failed for:", result.invite.contact);
      return Response.json({
        success: true,
        warning: `Invite created but ${channel} delivery failed. Please try again or use a different contact method.`,
      });
    }

    return Response.json({ success: true, message: `Invite sent via ${channel}` });
  },
};

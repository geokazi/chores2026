/**
 * Notification Settings API
 * POST /api/settings/notifications
 * Updates the parent's digest preferences in family_profiles.preferences.notifications
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.profileId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const profileId = session.user.profileId;
    const body = await req.json();
    const { weekly_summary, daily_digest, digest_channel, sms_limit_hit } = body;

    const supabase = getServiceSupabaseClient();

    // Get current preferences
    const { data: profile, error: fetchError } = await supabase
      .from("family_profiles")
      .select("preferences")
      .eq("id", profileId)
      .single();

    if (fetchError) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const prefs = profile.preferences || {};
    const notifications = prefs.notifications || {};

    // Update notification preferences
    const updatedNotifications = {
      ...notifications,
      ...(weekly_summary !== undefined && { weekly_summary }),
      ...(daily_digest !== undefined && { daily_digest }),
      ...(digest_channel !== undefined && { digest_channel }),
      ...(sms_limit_hit !== undefined && { sms_limit_hit }),
    };

    const { error: updateError } = await supabase
      .from("family_profiles")
      .update({
        preferences: {
          ...prefs,
          notifications: updatedNotifications,
        },
      })
      .eq("id", profileId);

    if (updateError) {
      console.error("Failed to update notification prefs:", updateError);
      return Response.json({ error: "Update failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  },
};

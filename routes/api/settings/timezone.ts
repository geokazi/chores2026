/**
 * Timezone Settings API
 * POST /api/settings/timezone
 * Stores user's browser-detected timezone in profile preferences.
 * Called automatically on page load (only when timezone changes).
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

    const body = await req.json();
    const { timezone } = body;

    // Validate it's a real IANA timezone
    try {
      Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return Response.json({ error: "Invalid timezone" }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const profileId = session.user.profileId;

    const { data: profile } = await supabase
      .from("family_profiles")
      .select("preferences")
      .eq("id", profileId)
      .single();

    const prefs = profile?.preferences || {};

    // Only update if changed
    if (prefs.timezone === timezone) {
      return Response.json({ ok: true, changed: false });
    }

    await supabase
      .from("family_profiles")
      .update({
        preferences: { ...prefs, timezone },
      })
      .eq("id", profileId);

    return Response.json({ ok: true, changed: true });
  },
};

/**
 * API: Get Today's Rotation Chores
 * GET /api/rotation/today
 *
 * Returns today's rotation chores for the authenticated user,
 * including completion status for each chore.
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getRotationConfig, getChoresForChild, getWeekTypeBadge } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the active kid profile from session
      const profileId = session.user?.profileId;
      if (!profileId) {
        return Response.json({ error: "No active profile" }, { status: 400 });
      }

      const familyId = session.family.id;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Fetch family settings to get rotation config
      const supabase = getSupabaseClient();
      const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (fetchError) {
        console.error('Rotation today fetch error:', fetchError);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      // Check if rotation is active
      const config = getRotationConfig(family?.settings || {});
      if (!config) {
        return Response.json({
          active: false,
          chores: [],
          message: "No active rotation template"
        });
      }

      // Get preset details
      const preset = getPresetByKey(config.active_preset);
      if (!preset) {
        return Response.json({
          active: false,
          chores: [],
          message: "Invalid rotation preset"
        });
      }

      // Get today's scheduled chores for this profile
      const scheduledChores = getChoresForChild(config, profileId, today);

      // Get completion status for each chore
      const completedChoreKeys = await getCompletedRotationChores(
        supabase,
        familyId,
        profileId,
        todayStr,
        config.active_preset
      );

      // Build response with completion status
      const choresWithStatus = scheduledChores.map(chore => ({
        key: chore.key,
        name: chore.name,
        icon: chore.icon,
        points: chore.points,
        category: chore.category,
        completed: completedChoreKeys.has(chore.key),
        source: "rotation",
        preset_key: config.active_preset,
        preset_name: preset.name,
      }));

      // Get badge info for display
      const badge = getWeekTypeBadge(config);

      return Response.json({
        active: true,
        date: todayStr,
        preset: {
          key: preset.key,
          name: preset.name,
          icon: preset.icon,
        },
        badge,
        chores: choresWithStatus,
        completed_count: choresWithStatus.filter(c => c.completed).length,
        total_count: choresWithStatus.length,
      });
    } catch (err) {
      console.error('Rotation today error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

/**
 * Query completed rotation chores for a specific date
 */
async function getCompletedRotationChores(
  supabase: ReturnType<typeof getSupabaseClient>,
  familyId: string,
  profileId: string,
  date: string,
  presetKey: string
): Promise<Set<string>> {
  const { data } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("metadata")
    .eq("family_id", familyId)
    .eq("profile_id", profileId)
    .eq("transaction_type", "chore_completed")
    .contains("metadata", {
      rotation_preset: presetKey,
      rotation_date: date
    });

  const completedKeys = new Set<string>();
  for (const tx of data || []) {
    const metadata = tx.metadata as Record<string, unknown> | null;
    if (metadata?.rotation_chore) {
      completedKeys.add(metadata.rotation_chore as string);
    }
  }
  return completedKeys;
}

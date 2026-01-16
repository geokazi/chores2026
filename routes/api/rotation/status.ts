/**
 * API: Get Rotation Status
 * GET /api/rotation/status
 *
 * Returns the current rotation configuration for the authenticated family,
 * including active preset, child mappings, and current week type.
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getRotationConfig, getWeekTypeBadge } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey, getCurrentWeekType } from "../../../lib/data/rotation-presets.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;

      // Fetch family settings
      const supabase = getSupabaseClient();
      const { data: family, error } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (error) {
        console.error('Rotation status error:', error);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      // Extract rotation config from JSONB
      const config = getRotationConfig(family?.settings || {});

      if (!config) {
        return Response.json({
          active: false,
          message: "No rotation preset configured"
        });
      }

      // Get preset details
      const preset = getPresetByKey(config.active_preset);
      if (!preset) {
        return Response.json({
          active: false,
          message: "Invalid preset configured",
          config
        });
      }

      // Get current week type for display
      const weekType = getCurrentWeekType(preset, config.start_date);
      const badge = getWeekTypeBadge(config);

      // Fetch child names for the mappings
      const profileIds = config.child_slots.map(s => s.profile_id);
      const { data: profiles } = await supabase
        .from('family_profiles')
        .select('id, name')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const childMappings = config.child_slots.map(slot => ({
        slot: slot.slot,
        profile_id: slot.profile_id,
        name: profileMap.get(slot.profile_id) || 'Unknown'
      }));

      return Response.json({
        active: true,
        preset: {
          key: preset.key,
          name: preset.name,
          icon: preset.icon,
          description: preset.description,
          cycle_type: preset.cycle_type
        },
        start_date: config.start_date,
        current_week_type: weekType,
        badge: badge,
        child_mappings: childMappings
      });
    } catch (err) {
      console.error('Rotation status error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

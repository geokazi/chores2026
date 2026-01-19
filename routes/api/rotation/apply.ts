/**
 * API: Apply Rotation Preset
 * POST /api/rotation/apply
 * DELETE /api/rotation/apply
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { buildRotationConfig, validateChildCount, getRequiredSlotCount } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";
import type { ChildSlotMapping, RotationCustomizations } from "../../../lib/types/rotation.ts";

interface ApplyRequest {
  preset_key: string;
  child_slots: ChildSlotMapping[];
  customizations?: RotationCustomizations | null;
  start_date?: string;  // Preserve existing start date on customization updates
}

export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;
      const body: ApplyRequest = await req.json();
      const { preset_key, child_slots, customizations, start_date } = body;

      // Validate preset exists
      const preset = getPresetByKey(preset_key);
      if (!preset) {
        return Response.json({ error: "Invalid preset" }, { status: 400 });
      }

      // Validate child count
      if (!validateChildCount(preset_key, child_slots.length)) {
        return Response.json({
          error: `Preset requires ${preset.min_children}-${preset.max_children} children`
        }, { status: 400 });
      }

      // Validate slot count matches preset (skip for dynamic presets which use participant slots)
      if (preset.is_dynamic) {
        // Dynamic presets: require at least 1 participant
        if (child_slots.length === 0) {
          return Response.json({
            error: "Please select at least one child to participate"
          }, { status: 400 });
        }
      } else {
        // Slot-based presets: require exact slot count
        const requiredSlots = getRequiredSlotCount(preset_key);
        if (child_slots.length !== requiredSlots) {
          return Response.json({
            error: `Preset requires exactly ${requiredSlots} children assigned`
          }, { status: 400 });
        }
      }

      // Validate no duplicate profile_ids
      const profileIds = child_slots.map(s => s.profile_id);
      const uniqueProfileIds = new Set(profileIds);
      if (uniqueProfileIds.size !== profileIds.length) {
        return Response.json({
          error: "Each child can only be assigned to one slot"
        }, { status: 400 });
      }

      // Validate all profile_ids belong to this family and are children
      const supabase = getSupabaseClient();
      const { data: profiles, error: profileError } = await supabase
        .from('family_profiles')
        .select('id, role')
        .eq('family_id', familyId)
        .in('id', profileIds);

      if (profileError) {
        console.error('Profile validation error:', profileError);
        return Response.json({ error: "Failed to validate profiles" }, { status: 500 });
      }

      // Check all profiles were found and belong to family
      if (!profiles || profiles.length !== profileIds.length) {
        return Response.json({
          error: "One or more profiles do not belong to this family"
        }, { status: 400 });
      }

      // Check all profiles are children (not parents)
      const nonChildren = profiles.filter(p => p.role !== 'child');
      if (nonChildren.length > 0) {
        return Response.json({
          error: "Only children can be assigned to rotation slots"
        }, { status: 400 });
      }

      // Build rotation config (preserve start_date on customization updates)
      const config = buildRotationConfig(preset_key, child_slots, customizations || undefined, start_date);

      // Fetch current settings, merge, then update
      const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (fetchError) {
        console.error('Rotation fetch error:', fetchError);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      const currentSettings = family?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps?.choregami,
            rotation: config,
          },
        },
      };

      const { error: updateError } = await supabase
        .from('families')
        .update({ settings: updatedSettings })
        .eq('id', familyId);

      if (updateError) {
        console.error('Rotation apply error:', updateError);
        return Response.json({ error: "Failed to save rotation config" }, { status: 500 });
      }

      console.log('✅ Rotation preset applied:', {
        family: session.family.name,
        preset: preset_key,
        children: child_slots.length,
      });

      return Response.json({
        success: true,
        preset: preset_key,
        start_date: config.start_date,
      });
    } catch (err) {
      console.error('Rotation apply error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },

  async DELETE(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;
      const supabase = getSupabaseClient();

      // Fetch current settings
      const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (fetchError) {
        console.error('Rotation fetch error:', fetchError);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      // Remove rotation from choregami settings
      const currentSettings = family?.settings || {};
      const choregamiSettings = { ...currentSettings.apps?.choregami };
      delete choregamiSettings.rotation;

      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: choregamiSettings,
        },
      };

      const { error: updateError } = await supabase
        .from('families')
        .update({ settings: updatedSettings })
        .eq('id', familyId);

      if (updateError) {
        console.error('Rotation remove error:', updateError);
        return Response.json({ error: "Failed to remove rotation config" }, { status: 500 });
      }

      console.log('✅ Rotation preset removed:', { family: session.family.name });

      return Response.json({ success: true });
    } catch (err) {
      console.error('Rotation remove error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

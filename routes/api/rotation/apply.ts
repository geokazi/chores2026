/**
 * API: Apply Rotation Preset
 * POST /api/rotation/apply
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getSessionFromRequest } from "../../../lib/auth/session.ts";
import { buildRotationConfig, validateChildCount, getRequiredSlotCount } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";
import type { ChildSlotMapping } from "../../../lib/types/rotation.ts";

interface ApplyRequest {
  preset_key: string;
  child_slots: ChildSlotMapping[];
}

export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await getSessionFromRequest(req);
      if (!session?.family_id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body: ApplyRequest = await req.json();
      const { preset_key, child_slots } = body;

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

      // Validate slot count matches preset
      const requiredSlots = getRequiredSlotCount(preset_key);
      if (child_slots.length !== requiredSlots) {
        return Response.json({
          error: `Preset requires exactly ${requiredSlots} children assigned`
        }, { status: 400 });
      }

      // Build config
      const config = buildRotationConfig(preset_key, child_slots);

      // Save to JSONB using jsonb_set
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('jsonb_set_nested', {
        p_table: 'families',
        p_id: session.family_id,
        p_path: ['apps', 'choregami', 'rotation'],
        p_value: config,
      });

      // Fallback: direct update if RPC not available
      if (error?.message?.includes('function')) {
        const { error: updateError } = await supabase
          .from('families')
          .update({
            settings: supabase.sql`
              jsonb_set(
                COALESCE(settings, '{}'::jsonb),
                '{apps,choregami,rotation}',
                ${JSON.stringify(config)}::jsonb
              )
            `
          })
          .eq('id', session.family_id);

        if (updateError) {
          console.error('Rotation apply error:', updateError);
          return Response.json({ error: "Failed to save rotation config" }, { status: 500 });
        }
      } else if (error) {
        console.error('Rotation apply error:', error);
        return Response.json({ error: "Failed to save rotation config" }, { status: 500 });
      }

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
      const session = await getSessionFromRequest(req);
      if (!session?.family_id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Remove rotation config from JSONB
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('families')
        .update({
          settings: supabase.sql`settings #- '{apps,choregami,rotation}'`
        })
        .eq('id', session.family_id);

      if (error) {
        console.error('Rotation remove error:', error);
        return Response.json({ error: "Failed to remove rotation config" }, { status: 500 });
      }

      return Response.json({ success: true });
    } catch (err) {
      console.error('Rotation remove error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

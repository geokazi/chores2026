/**
 * API: Family Custom Chores
 * POST /api/family/custom-chores - Save family-level custom chores
 * GET /api/family/custom-chores - Get family custom chores
 *
 * Custom chores are stored at family level (not per-template) so they
 * appear in ALL templates. Stored in: settings.apps.choregami.custom_chores
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import type { CustomChore } from "../../../lib/types/rotation.ts";

interface CustomChoresRequest {
  custom_chores: CustomChore[];
}

export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;
      const supabase = getSupabaseClient();

      const { data: family, error } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (error) {
        console.error('Failed to fetch family settings:', error);
        return Response.json({ error: "Failed to fetch custom chores" }, { status: 500 });
      }

      const customChores = family?.settings?.apps?.choregami?.custom_chores || [];

      return Response.json({ custom_chores: customChores });
    } catch (err) {
      console.error('Custom chores GET error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },

  async POST(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;
      const body: CustomChoresRequest = await req.json();
      const { custom_chores } = body;

      // Validate custom chores array
      if (!Array.isArray(custom_chores)) {
        return Response.json({ error: "custom_chores must be an array" }, { status: 400 });
      }

      // Validate each custom chore
      for (const chore of custom_chores) {
        if (!chore.key || !chore.name) {
          return Response.json({ error: "Each chore must have key and name" }, { status: 400 });
        }
        if (typeof chore.points !== 'number' || chore.points < 0) {
          return Response.json({ error: "Each chore must have valid points (>= 0)" }, { status: 400 });
        }
      }

      const supabase = getSupabaseClient();

      // Fetch current settings
      const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch family settings:', fetchError);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      // Merge custom chores into settings at family level
      const currentSettings = family?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps?.choregami,
            custom_chores: custom_chores,
          },
        },
      };

      // Update settings
      const { error: updateError } = await supabase
        .from('families')
        .update({ settings: updatedSettings })
        .eq('id', familyId);

      if (updateError) {
        console.error('Failed to update custom chores:', updateError);
        return Response.json({ error: "Failed to save custom chores" }, { status: 500 });
      }

      console.log('✅ Family custom chores updated:', {
        family: session.family.name,
        count: custom_chores.length,
      });

      return Response.json({
        success: true,
        custom_chores: custom_chores,
      });
    } catch (err) {
      console.error('Custom chores POST error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

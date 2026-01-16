/**
 * Secure Kid Chores API (Session-Based)
 * Gets chores for active kid without exposing GUIDs
 * Includes both manual chores and rotation template chores
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";
import { getRotationConfig, getChoresForChild } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";

export const handler: Handlers = {
  async POST(req) {
    // SECURITY: Verify parent session first
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      // Get kid ID and local date from request body (not URL)
      const { kidId, localDate } = await req.json();

      if (!kidId) {
        return new Response(
          JSON.stringify({ error: "Kid ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const choreService = new ChoreService();
      const familyId = parentSession.family.id;

      // Verify kid belongs to authenticated family
      const kid = await choreService.getFamilyMember(kidId);
      if (!kid || kid.family_id !== familyId) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Get today's manual chores from database
      const manualChores = await choreService.getTodaysChores(
        kidId,
        familyId,
        localDate,
      );

      // Get rotation chores if template is active
      const supabase = getSupabaseClient();
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      const rotationConfig = getRotationConfig(family?.settings || {});
      let rotationChores: any[] = [];

      if (rotationConfig) {
        const preset = getPresetByKey(rotationConfig.active_preset);
        if (preset) {
          // Get rotation chores for this kid today
          const requestDate = new Date(localDate + "T12:00:00");
          const scheduledChores = getChoresForChild(rotationConfig, kidId, requestDate);

          // Get completion status for rotation chores
          const { data: completedTx } = await supabase
            .schema("choretracker")
            .from("chore_transactions")
            .select("metadata")
            .eq("family_id", familyId)
            .eq("profile_id", kidId)
            .eq("transaction_type", "chore_completed")
            .contains("metadata", {
              rotation_preset: rotationConfig.active_preset,
              rotation_date: localDate
            });

          const completedKeys = new Set<string>();
          for (const tx of completedTx || []) {
            const metadata = tx.metadata as Record<string, unknown> | null;
            if (metadata?.rotation_chore) {
              completedKeys.add(metadata.rotation_chore as string);
            }
          }

          // Convert rotation chores to the same format as manual chores
          rotationChores = scheduledChores.map(chore => ({
            id: `rotation_${rotationConfig.active_preset}_${chore.key}_${localDate}`,
            status: completedKeys.has(chore.key) ? "completed" : "pending",
            point_value: chore.points,
            source: "rotation",
            rotation_key: chore.key,
            rotation_preset: rotationConfig.active_preset,
            rotation_date: localDate,
            chore_template: {
              name: chore.name,
              icon: chore.icon,
              description: `From: ${preset.name}`,
            },
          }));
        }
      }

      // Merge: manual chores first, then rotation chores
      // Mark manual chores with source
      const allChores = [
        ...manualChores.map((c: any) => ({ ...c, source: "manual" })),
        ...rotationChores,
      ];

      return new Response(
        JSON.stringify(allChores),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Error fetching kid chores:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chores" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};
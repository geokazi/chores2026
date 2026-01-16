/**
 * API: Complete Rotation Chore
 * POST /api/rotation/complete
 *
 * Marks a rotation chore as completed for the authenticated user.
 * Uses TransactionService for points and includes idempotency check.
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getRotationConfig, getChoresForChild } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";
import { TransactionService } from "../../../lib/services/transaction-service.ts";

interface CompleteRequest {
  chore_key: string;
  date: string; // YYYY-MM-DD for idempotency
}

export const handler: Handlers = {
  async POST(req) {
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
      const body: CompleteRequest = await req.json();
      const { chore_key, date } = body;

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
      }

      // Fetch family settings to get rotation config
      const supabase = getSupabaseClient();
      const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single();

      if (fetchError) {
        console.error('Rotation complete fetch error:', fetchError);
        return Response.json({ error: "Failed to fetch family settings" }, { status: 500 });
      }

      // Check if rotation is active
      const config = getRotationConfig(family?.settings || {});
      if (!config) {
        return Response.json({ error: "No active rotation template" }, { status: 400 });
      }

      // Get preset details
      const preset = getPresetByKey(config.active_preset);
      if (!preset) {
        return Response.json({ error: "Invalid rotation preset" }, { status: 400 });
      }

      // Find the chore in the preset
      const chore = preset.chores.find(c => c.key === chore_key);
      if (!chore) {
        return Response.json({ error: "Invalid chore key" }, { status: 400 });
      }

      // Check if this chore is scheduled for this profile on this date
      const requestDate = new Date(date + "T12:00:00"); // Use noon to avoid timezone issues
      const scheduledChores = getChoresForChild(config, profileId, requestDate);
      const isScheduled = scheduledChores.some(c => c.key === chore_key);

      if (!isScheduled) {
        return Response.json({
          error: "This chore is not assigned to you today"
        }, { status: 400 });
      }

      // Idempotency check: prevent double-completion
      const { data: existingCompletion } = await supabase
        .schema("choretracker")
        .from("chore_transactions")
        .select("id")
        .eq("family_id", familyId)
        .eq("profile_id", profileId)
        .eq("transaction_type", "chore_completed")
        .contains("metadata", {
          rotation_preset: config.active_preset,
          rotation_chore: chore_key,
          rotation_date: date
        })
        .maybeSingle();

      if (existingCompletion) {
        return Response.json({
          error: "Chore already completed today",
          already_completed: true
        }, { status: 409 });
      }

      // Record the completion via TransactionService
      const transactionService = new TransactionService();
      await transactionService.recordChoreCompletion(
        null, // No chore_assignment_id for rotation chores
        chore.points,
        chore.name,
        profileId,
        familyId,
        {
          rotation_preset: config.active_preset,
          rotation_chore: chore_key,
          rotation_date: date,
          source: "rotation_template"
        }
      );

      console.log('✅ Rotation chore completed:', {
        family: session.family.name,
        profile: profileId,
        chore: chore.name,
        points: chore.points,
        date,
      });

      return Response.json({
        success: true,
        chore: {
          key: chore.key,
          name: chore.name,
          points: chore.points,
        },
        date,
      });
    } catch (err) {
      console.error('Rotation complete error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

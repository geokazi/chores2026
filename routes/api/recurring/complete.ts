/**
 * API: Complete Recurring Chore
 * POST /api/recurring/complete
 *
 * Marks a recurring chore template as completed for today.
 * Uses TransactionService for points and includes idempotency check.
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { TransactionService } from "../../../lib/services/transaction-service.ts";
import { getActivityService } from "../../../lib/services/activity-service.ts";

interface CompleteRequest {
  template_id: string;
  date: string; // YYYY-MM-DD for idempotency
  kid_id?: string; // Profile ID of the kid completing the chore
}

export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await getAuthenticatedSession(req);
      if (!session.isAuthenticated || !session.family) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const familyId = session.family.id;
      const body: CompleteRequest = await req.json();
      const { template_id, date, kid_id } = body;

      // Use kid_id from body (kid dashboard) or fall back to session profile (parent)
      const profileId = kid_id || session.user?.profileId;
      if (!profileId) {
        return Response.json({ error: "No active profile" }, { status: 400 });
      }

      // Validate the profile belongs to this family
      const isFamilyMember = session.family.members?.some(
        (m: any) => m.id === profileId
      );
      if (!isFamilyMember) {
        return Response.json({ error: "Profile not in family" }, { status: 403 });
      }

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
      }

      // Fetch the recurring template
      const supabase = getSupabaseClient();
      const { data: template, error: templateError } = await supabase
        .schema("choretracker")
        .from("chore_templates")
        .select("id, name, points, recurring_days, assigned_to_profile_id, icon")
        .eq("id", template_id)
        .eq("family_id", familyId)
        .eq("is_recurring", true)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .single();

      if (templateError || !template) {
        return Response.json({ error: "Recurring chore not found" }, { status: 404 });
      }

      // Verify chore is assigned to this profile
      if (template.assigned_to_profile_id !== profileId) {
        return Response.json({ error: "This chore is not assigned to you" }, { status: 403 });
      }

      // Verify today matches one of the recurring days
      const dayNameToNum: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
      };
      const requestDate = new Date(date + "T12:00:00");
      const todayDayNum = requestDate.getDay();
      const recurringDays = template.recurring_days || [];
      const isDueToday = recurringDays.some((dayName: string) => dayNameToNum[dayName] === todayDayNum);

      if (!isDueToday) {
        return Response.json({ error: "This chore is not due today" }, { status: 400 });
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
          recurring_template_id: template_id,
          recurring_date: date
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
        null, // No chore_assignment_id for recurring chores
        template.points,
        template.name,
        profileId,
        familyId,
        {
          recurring_template_id: template_id,
          recurring_date: date,
          source: "recurring_template"
        }
      );

      // Log activity (non-blocking)
      try {
        const activityService = getActivityService();
        const profileName = session.family.members?.find(
          (m: any) => m.id === profileId
        )?.name || "Family Member";
        await activityService.logActivity({
          familyId,
          actorId: profileId,
          actorName: profileName,
          type: "chore_completed",
          title: `${profileName} completed "${template.name}"`,
          points: template.points,
          target: {
            type: "recurring_chore",
            id: template_id,
            name: template.name,
          },
        });
      } catch (error) {
        console.warn("Failed to log recurring activity:", error);
      }

      console.log('✅ Recurring chore completed:', {
        family: session.family.name,
        profile: profileId,
        chore: template.name,
        points: template.points,
        date,
      });

      return Response.json({
        success: true,
        chore: {
          id: template.id,
          name: template.name,
          points: template.points,
          icon: template.icon || "🔁",
        },
        points_earned: template.points,
        date,
      });
    } catch (err) {
      console.error('Recurring complete error:', err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

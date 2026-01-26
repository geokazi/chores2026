/**
 * Simple Chore Creation API
 * Creates chore templates and assigns them - under 100 lines
 * Follows same security pattern as other APIs
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";
import { getActivityService } from "../../../lib/services/activity-service.ts";

interface CreateChoreRequest {
  name: string;
  description?: string;
  points: number;
  assignedTo: string; // kid profile ID
  dueDate: string; // ISO date string
  category?: string;
  familyEventId?: string; // optional event link
  isRecurring?: boolean; // if true, creates recurring template
  recurringDays?: string[]; // e.g., ['mon', 'wed', 'fri']
}

export const handler: Handlers = {
  async POST(req) {
    // SECURITY: Verify parent session (same as other APIs)
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      const choreData: CreateChoreRequest = await req.json();
      
      // Basic validation
      if (!choreData.name?.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "Chore name required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!choreData.assignedTo) {
        return new Response(
          JSON.stringify({ success: false, error: "Assigned person required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Recurring chores need days specified, one-time need due date
      if (choreData.isRecurring) {
        if (!choreData.recurringDays || choreData.recurringDays.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Recurring days required for recurring chores" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      } else if (!choreData.dueDate) {
        return new Response(
          JSON.stringify({ success: false, error: "Due date required for one-time chores" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const choreService = new ChoreService();
      
      // Verify assigned person belongs to family
      const assignedMember = await choreService.getFamilyMember(choreData.assignedTo);
      if (!assignedMember || assignedMember.family_id !== parentSession.family.id) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid family member" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get current parent's profile ID for audit trail
      const familyMembers = await choreService.getFamilyMembers(parentSession.family.id);
      const currentParent = familyMembers.find(m => 
        m.role === "parent" && m.user_id === parentSession.user?.id
      );
      
      if (!currentParent) {
        return new Response(
          JSON.stringify({ success: false, error: "Parent profile not found" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Create chore template and assignment in one step
      // For recurring chores, only template is created (cron generates daily assignments)
      const result = await choreService.createChoreWithTemplate(
        choreData.name,
        choreData.description || "",
        choreData.points,
        choreData.assignedTo,
        parentSession.family.id,
        currentParent.id,
        choreData.dueDate,
        choreData.category || "household",
        choreData.familyEventId || null,
        choreData.isRecurring || false,
        choreData.recurringDays
      );

      if (result.success) {
        const isRecurring = choreData.isRecurring || false;
        console.log(`✅ ${isRecurring ? 'Recurring chore' : 'Chore'} created: ${choreData.name} assigned to ${assignedMember.name}`);

        // Log activity (non-blocking)
        try {
          const activityService = getActivityService();
          const isLinkedChore = !!choreData.familyEventId;
          const activityType = isRecurring ? "recurring_chore_created" :
            isLinkedChore ? "linked_chore_created" : "chore_created";
          await activityService.logActivity({
            familyId: parentSession.family.id,
            actorId: currentParent.id,
            actorName: currentParent.name,
            type: activityType,
            title: isRecurring
              ? `${currentParent.name} created recurring chore "${choreData.name}"`
              : isLinkedChore
                ? `${currentParent.name} linked chore "${choreData.name}" to event`
                : `${currentParent.name} created chore "${choreData.name}"`,
            target: {
              type: isRecurring ? "chore_template" : "chore_assignment",
              id: result.assignment?.id || result.templateId || "",
              name: choreData.name,
            },
            meta: isLinkedChore ? { eventId: choreData.familyEventId } : undefined,
          });
        } catch (error) {
          console.warn("Failed to log activity:", error);
        }

        const message = isRecurring
          ? `Recurring chore "${choreData.name}" created for ${assignedMember.name} on ${choreData.recurringDays?.join(', ')}`
          : `Chore "${choreData.name}" created for ${assignedMember.name}`;

        return new Response(
          JSON.stringify({
            success: true,
            message,
            choreId: result.assignment?.id,
            templateId: result.templateId,
            isRecurring
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: result.error || "Failed to create chore" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

    } catch (error) {
      console.error("❌ Error creating chore:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Internal server error" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};
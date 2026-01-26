/**
 * Get Manual Chores API
 * Returns recurring templates AND pending one-time assignments
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const familyId = session.family.id;
    const supabase = getSupabaseClient();

    // Get recurring templates
    const { data: templates, error: templateError } = await supabase
      .schema("choretracker")
      .from("chore_templates")
      .select("id, name, points, recurring_days, assigned_to_profile_id")
      .eq("family_id", familyId)
      .eq("is_recurring", true)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("name");

    if (templateError) {
      console.error("Error fetching recurring templates:", templateError);
    }

    // Get pending one-time assignments (today and future)
    // Use local date components to avoid UTC timezone issues
    // (e.g., 8 PM Sunday local time shouldn't become Monday UTC)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data: assignments, error: assignmentError } = await supabase
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        id, point_value, due_date, assigned_to_profile_id,
        chore_template:chore_templates!inner(id, name, is_recurring)
      `)
      .eq("family_id", familyId)
      .eq("is_deleted", false)
      .in("status", ["pending", "assigned"])
      .gte("due_date", today)
      .eq("chore_template.is_recurring", false)
      .order("due_date");

    if (assignmentError) {
      console.error("Error fetching one-time assignments:", assignmentError);
    }

    // Collect all profile IDs
    const profileIds = new Set<string>();
    (templates || []).forEach(t => t.assigned_to_profile_id && profileIds.add(t.assigned_to_profile_id));
    (assignments || []).forEach(a => a.assigned_to_profile_id && profileIds.add(a.assigned_to_profile_id));

    // Get profile names
    let profileMap = new Map<string, string>();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from("family_profiles")
        .select("id, name")
        .in("id", Array.from(profileIds));

      profileMap = new Map((profiles || []).map(p => [p.id, p.name]));
    }

    // Enrich recurring templates
    const recurringChores = (templates || []).map(t => ({
      id: t.id,
      type: 'recurring' as const,
      name: t.name,
      points: t.points,
      recurring_days: t.recurring_days,
      assigned_to_profile_id: t.assigned_to_profile_id,
      assigned_to_name: profileMap.get(t.assigned_to_profile_id) || undefined
    }));

    // Enrich one-time assignments
    const oneTimeChores = (assignments || []).map(a => ({
      id: a.id,
      type: 'one_time' as const,
      name: (a.chore_template as any)?.name || 'Unknown',
      points: a.point_value,
      due_date: a.due_date,
      assigned_to_profile_id: a.assigned_to_profile_id,
      assigned_to_name: profileMap.get(a.assigned_to_profile_id) || undefined
    }));

    return Response.json({
      success: true,
      templates: recurringChores,  // Keep for backwards compat
      recurring: recurringChores,
      oneTime: oneTimeChores
    });
  },
};

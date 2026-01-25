/**
 * Chore Service for ChoreGami 2026
 * Basic CRUD operations for chores and assignments using existing database tables
 */

import { createClient } from "@supabase/supabase-js";
import { notifyGoalAchieved } from "./email-service.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface ChoreTemplate {
  id: string;
  family_id: string;
  name: string;
  description?: string;
  points: number;
  icon?: string;
  difficulty?: "easy" | "medium" | "hard";
  estimated_minutes?: number;
  category?: string;
  is_active: boolean;
}

export interface ChoreAssignment {
  id: string;
  family_id: string;
  chore_template_id: string;
  assigned_to_profile_id: string;
  due_date?: string;
  status: "pending" | "completed" | "verified" | "rejected";
  point_value: number;
  assigned_date: string;
  due_time?: string;
  notes?: string;
  completed_at?: string;
  completed_by_profile_id?: string;
  chore_template?: ChoreTemplate;
}

export interface FamilyProfile {
  id: string;
  family_id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
  pin_hash?: string;
  user_id?: string;
}

export interface Family {
  id: string;
  name: string;
  children_pins_enabled: boolean;
}

export class ChoreService {
  private client: any;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get family by ID
   */
  async getFamily(familyId: string): Promise<Family | null> {
    const { data, error } = await this.client
      .from("families")
      .select("*")
      .eq("id", familyId)
      .single();

    if (error) {
      console.error("Error fetching family:", error);
      return null;
    }

    return data;
  }

  /**
   * Get family members by family ID
   */
  async getFamilyMembers(familyId: string): Promise<FamilyProfile[]> {
    const { data, error } = await this.client
      .from("family_profiles")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_deleted", false)
      .order("role", { ascending: false }) // Parents first, then children
      .order("name");

    if (error) {
      console.error("Error fetching family members:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get family member by ID
   */
  async getFamilyMember(profileId: string): Promise<FamilyProfile | null> {
    const { data, error } = await this.client
      .from("family_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Error fetching family member:", error);
      return null;
    }

    return data;
  }

  /**
   * Get today's chore assignments for a family member
   * @param localDate - Optional client's local date in YYYY-MM-DD format (for timezone accuracy)
   */
  async getTodaysChores(
    profileId: string,
    familyId: string,
    localDate?: string,
  ): Promise<ChoreAssignment[]> {
    // Get chores that are available today:
    // - Recurring chores: only if due today
    // - One-time chores: if due today or overdue

    // Use client's local date if provided, otherwise fall back to server date
    let today: Date;
    if (localDate) {
      // Parse client's local date (YYYY-MM-DD format)
      const [year, month, day] = localDate.split('-').map(Number);
      today = new Date(year, month - 1, day);
      console.log(`📅 Using client local date: ${localDate} -> ${today.toDateString()}`);
    } else {
      today = new Date();
      console.log(`📅 Using server date (no localDate provided): ${today.toDateString()}`);
    }

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayStartStr = todayStart.toISOString();
    const todayEndStr = todayEnd.toISOString();

    // Get all pending chores for this user
    // Use explicit FK reference for reliable join behavior
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates!inner(*),
        family_event:family_events!family_event_id(id, title, event_date, schedule_data, metadata, is_deleted)
      `)
      .eq("family_id", familyId)
      .eq("assigned_to_profile_id", profileId)
      .eq("is_deleted", false)
      .eq("chore_template.is_deleted", false)
      .eq("chore_template.is_active", true)
      .in("status", ["pending", "assigned"])
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching today's chores:", error);
      return [];
    }

    // Debug logging for event join
    const withEvent = (data || []).filter((c: any) => c.family_event);
    const withEventId = (data || []).filter((c: any) => c.family_event_id);
    console.log(`📋 Chores loaded: ${data?.length || 0}, with family_event_id: ${withEventId.length}, with family_event object: ${withEvent.length}`);

    // Filter chores based on type and due date
    // Also clear event data for soft-deleted events
    const filteredChores = (data || []).filter((chore: any) => {
      // Clear event reference if event is soft-deleted
      if (chore.family_event?.is_deleted) {
        console.log(`📋 Clearing deleted event reference for chore: ${chore.chore_template?.name}`);
        chore.family_event = null;
      }

      if (!chore.due_date) return false;

      const dueDate = new Date(chore.due_date);
      const isRecurring = chore.chore_template?.is_recurring || chore.is_recurring_instance;

      if (isRecurring) {
        // Recurring chores: only show if due today
        const choreDay = dueDate.toDateString();
        const todayDay = today.toDateString();
        return choreDay === todayDay;
      } else {
        // One-time chores: show if due today or overdue
        return dueDate <= todayEnd;
      }
    });

    console.log(`📋 Found ${filteredChores.length} available chores for user ${profileId}`);
    return filteredChores;
  }

  /**
   * Get all chore assignments for a family member (recent)
   */
  async getRecentChores(
    profileId: string,
    familyId: string,
    limit: number = 20,
  ): Promise<ChoreAssignment[]> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates(*)
      `)
      .eq("family_id", familyId)
      .eq("assigned_to_profile_id", profileId)
      .eq("is_deleted", false)
      .order("assigned_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent chores:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get chore assignment by ID
   */
  async getChoreAssignment(
    choreId: string,
    familyId: string,
  ): Promise<ChoreAssignment | null> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates(*)
      `)
      .eq("id", choreId)
      .eq("family_id", familyId)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Error fetching chore assignment:", error);
      return null;
    }

    return data;
  }

  /**
   * Complete a chore assignment
   */
  async completeChore(
    choreId: string,
    profileId: string,
    familyId: string,
  ): Promise<
    { success: boolean; assignment?: ChoreAssignment; error?: string }
  > {
    try {
      // First get the assignment to verify it exists and get point value
      const assignment = await this.getChoreAssignment(choreId, familyId);
      if (!assignment) {
        return { success: false, error: "Chore assignment not found" };
      }

      if (assignment.assigned_to_profile_id !== profileId) {
        return { success: false, error: "Chore not assigned to this user" };
      }

      if (assignment.status === "completed") {
        return { success: false, error: "Chore already completed" };
      }

      // Mark as completed
      const { data, error } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by_profile_id: profileId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", choreId)
        .eq("family_id", familyId)
        .select()
        .single();

      if (error) {
        console.error("Error completing chore:", error);
        return { success: false, error: "Failed to complete chore" };
      }

      return { success: true, assignment: data };
    } catch (error) {
      console.error("Error in completeChore:", error);
      return { success: false, error: "Internal error" };
    }
  }

  /**
   * Reverse a chore completion
   */
  async reverseChore(
    choreId: string,
    familyId: string,
    reason: string,
  ): Promise<
    { success: boolean; assignment?: ChoreAssignment; error?: string }
  > {
    try {
      // Get the assignment
      const assignment = await this.getChoreAssignment(choreId, familyId);
      if (!assignment) {
        return { success: false, error: "Chore assignment not found" };
      }

      if (assignment.status !== "completed") {
        return { success: false, error: "Chore is not completed" };
      }

      // Mark as pending again
      const { data, error } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .update({
          status: "pending",
          completed_at: null,
          completed_by_profile_id: null,
          completion_notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", choreId)
        .eq("family_id", familyId)
        .select()
        .single();

      if (error) {
        console.error("Error reversing chore:", error);
        return { success: false, error: "Failed to reverse chore" };
      }

      return { success: true, assignment: data };
    } catch (error) {
      console.error("Error in reverseChore:", error);
      return { success: false, error: "Internal error" };
    }
  }

  /**
   * Get chore templates for a family
   */
  async getChoreTemplates(familyId: string): Promise<ChoreTemplate[]> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_templates")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("name");

    if (error) {
      console.error("Error fetching chore templates:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a simple chore assignment for today
   */
  async createTodaysChore(
    choreTemplateId: string,
    assignedToProfileId: string,
    familyId: string,
    assignedByProfileId: string,
    pointValue?: number,
  ): Promise<
    { success: boolean; assignment?: ChoreAssignment; error?: string }
  > {
    try {
      const template = await this.getChoreTemplate(choreTemplateId, familyId);
      if (!template) {
        return { success: false, error: "Chore template not found" };
      }

      const today = new Date().toISOString().split("T")[0];
      const finalPointValue = pointValue || template.points;

      const { data, error } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .insert({
          family_id: familyId,
          chore_template_id: choreTemplateId,
          assigned_to_profile_id: assignedToProfileId,
          assigned_date: today,
          due_date: today + "T23:59:59.999Z",
          status: "pending",
          point_value: finalPointValue,
          assigned_by_profile_id: assignedByProfileId,
          created_by_profile_id: assignedByProfileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          chore_template:chore_templates(*)
        `)
        .single();

      if (error) {
        console.error("Error creating chore assignment:", error);
        return { success: false, error: "Failed to create chore assignment" };
      }

      return { success: true, assignment: data };
    } catch (error) {
      console.error("Error in createTodaysChore:", error);
      return { success: false, error: "Internal error" };
    }
  }

  /**
   * Get chore template by ID
   */
  private async getChoreTemplate(
    templateId: string,
    familyId: string,
  ): Promise<ChoreTemplate | null> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_templates")
      .select("*")
      .eq("id", templateId)
      .eq("family_id", familyId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Error fetching chore template:", error);
      return null;
    }

    return data;
  }

  /**
   * Update family PIN settings
   */
  async updateChildrenPinsEnabled(
    familyId: string,
    enabled: boolean,
  ): Promise<boolean> {
    const { error } = await this.client
      .from("families")
      .update({ children_pins_enabled: enabled })
      .eq("id", familyId);

    if (error) {
      console.error("Error updating children pins setting:", error);
      return false;
    }

    return true;
  }

  /**
   * Update kid PIN hash
   */
  async updateKidPin(
    profileId: string,
    pinHash: string | null,
  ): Promise<boolean> {
    const { error } = await this.client
      .from("family_profiles")
      .update({ pin_hash: pinHash })
      .eq("id", profileId)
      .eq("role", "child"); // Only allow updating child PINs

    if (error) {
      console.error("Error updating kid PIN:", error);
      return false;
    }

    return true;
  }

  /**
   * Get recent family activity (all members)
   */
  async getRecentActivity(
    familyId: string,
    limit: number = 10,
  ): Promise<ChoreAssignment[]> {
    // Get completed chore assignments first
    const { data: assignments, error: assignmentsError } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates(*)
      `)
      .eq("family_id", familyId)
      .eq("status", "completed")
      .eq("is_deleted", false)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (assignmentsError) {
      console.error("Error fetching recent activity:", assignmentsError);
      return [];
    }

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Get family profiles separately
    const profileIds = [...new Set([
      ...assignments.map((a: any) => a.assigned_to_profile_id).filter(Boolean),
      ...assignments.map((a: any) => a.completed_by_profile_id).filter(Boolean),
    ])];

    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name")
      .in("id", profileIds);

    // Map profiles to assignments
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    return assignments.map((assignment: any) => ({
      ...assignment,
      assigned_to_profile: profileMap.get(assignment.assigned_to_profile_id) || null,
      completed_by_profile: profileMap.get(assignment.completed_by_profile_id) || null,
    }));
  }

  /**
   * Get all chores for a family (for parent dashboard)
   */
  async getAllChores(familyId: string): Promise<ChoreAssignment[]> {
    // Get chore assignments first
    const { data: assignments, error: assignmentsError } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates(*)
      `)
      .eq("family_id", familyId)
      .eq("is_deleted", false)
      .order("assigned_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (assignmentsError) {
      console.error("Error fetching all chores:", assignmentsError);
      return [];
    }

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Get family profiles separately
    const profileIds = [...new Set(assignments.map((a: any) => a.assigned_to_profile_id).filter(Boolean))];

    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name, role")
      .in("id", profileIds);

    // Map profiles to assignments
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    return assignments.map((assignment: any) => ({
      ...assignment,
      assigned_to_profile: profileMap.get(assignment.assigned_to_profile_id) || null,
    }));
  }

  /**
   * Update family PIN setting
   */
  async updateFamilyPinSetting(
    familyId: string,
    enabled: boolean,
  ): Promise<boolean> {
    console.log("🔧 ChoreService.updateFamilyPinSetting called:", {
      familyId,
      enabled,
      clientReady: !!this.client
    });

    const { data, error } = await this.client
      .from("families")
      .update({ children_pins_enabled: enabled })
      .eq("id", familyId)
      .select("id, children_pins_enabled")
      .single();

    console.log("🔧 Supabase update response:", { data, error });

    if (error) {
      console.error("❌ Error updating family PIN setting:", error);
      return false;
    }

    console.log("✅ Family PIN setting updated in database:", data);
    return true;
  }

  /**
   * Set initial default PIN for a parent (1234)
   */
  async setDefaultParentPin(parentId: string): Promise<boolean> {
    return await this.setKidPin(parentId, "1234");
  }

  /**
   * Check if member is using default PIN (1234)
   */
  async isUsingDefaultPin(memberId: string): Promise<boolean> {
    try {
      const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
      
      const { data, error } = await this.client
        .from("family_profiles")
        .select("pin_hash")
        .eq("id", memberId)
        .single();

      if (error || !data?.pin_hash) {
        return false;
      }

      // Check if the stored hash matches default PIN "1234"
      return await bcrypt.compare("1234", data.pin_hash);
    } catch (error) {
      console.error("Error checking default PIN:", error);
      return false;
    }
  }

  /**
   * Set kid PIN (hash and store)
   */
  async setKidPin(kidId: string, pin: string): Promise<boolean> {
    console.log("🔧 ChoreService.setKidPin called:", {
      kidId,
      pinLength: pin.length,
      clientReady: !!this.client
    });

    try {
      // Hash the PIN using bcryptjs (same as client)
      console.log("🔧 Importing bcryptjs...");
      const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
      console.log("🔧 bcryptjs imported successfully");
      
      console.log("🔧 Hashing PIN...");
      const pinHash = await bcrypt.default.hash(pin, 10);
      console.log("🔧 PIN hashed successfully with format:", pinHash.substring(0, 10) + "...");
      console.log("🔧 Is valid bcrypt format:", pinHash.startsWith('$2'));

      const { data, error } = await this.client
        .from("family_profiles")
        .update({ pin_hash: pinHash })
        .eq("id", kidId)
        .select("id, name, pin_hash")
        .single();

      console.log("🔧 Supabase PIN update response:", { 
        data: data ? { id: data.id, name: data.name, hasPinHash: !!data.pin_hash } : null, 
        error 
      });

      if (error) {
        console.error("❌ Error updating kid PIN:", error);
        return false;
      }

      console.log("✅ Kid PIN updated successfully in database");
      return true;
    } catch (error) {
      console.error("❌ Error in setKidPin:", error);
      return false;
    }
  }

  /**
   * Verify PIN for any family member (parent or kid)
   */
  async verifyMemberPin(memberId: string, pin: string): Promise<boolean> {
    console.log("🔧 ChoreService.verifyMemberPin called:", {
      memberId,
      pinLength: pin.length,
      clientReady: !!this.client
    });

    try {
      // Get the member's PIN hash from database
      const { data, error } = await this.client
        .from("family_profiles")
        .select("pin_hash, name, role")
        .eq("id", memberId)
        .single();

      if (error || !data) {
        console.error("❌ Error getting member for PIN verification:", error);
        return false;
      }

      if (!data.pin_hash) {
        console.log("❌ No PIN set for member:", data.name);
        return false;
      }

      // Import bcryptjs for PIN comparison (same as setKidPin)
      console.log("🔧 Importing bcryptjs for verification...");
      const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
      console.log("🔧 bcryptjs imported successfully");
      console.log("🔧 Available bcrypt methods:", Object.keys(bcrypt));

      // Verify PIN against stored hash
      const isValid = await bcrypt.default.compare(pin, data.pin_hash);
      console.log(`🔧 PIN verification result for ${data.name}: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
      
      return isValid;
    } catch (error) {
      console.error("❌ Error in verifyMemberPin:", error);
      return false;
    }
  }

  /**
   * Set member PIN hash (works for both kids and parents)
   */
  async setKidPinHash(memberId: string, pinHash: string): Promise<boolean> {
    const { error } = await this.client
      .from("family_profiles")
      .update({ pin_hash: pinHash })
      .eq("id", memberId);

    if (error) {
      console.error("Error setting member PIN hash:", error);
      return false;
    }

    return true;
  }

  /**
   * Get kid PIN hash
   */
  async getKidPin(kidId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("family_profiles")
      .select("pin_hash")
      .eq("id", kidId)
      .eq("role", "child")
      .single();

    if (error) {
      console.error("Error getting kid PIN:", error);
      return null;
    }

    return data?.pin_hash || null;
  }

  /**
   * Get family settings (PIN enabled, theme, etc.)
   */
  async getFamilySettings(familyId: string): Promise<any> {
    const { data, error } = await this.client
      .from("families")
      .select("children_pins_enabled, theme, created_at")
      .eq("id", familyId)
      .single();

    if (error) {
      console.error("Error getting family settings:", error);
      return { children_pins_enabled: false, theme: "fresh_meadow" };
    }

    return data || { children_pins_enabled: false, theme: "fresh_meadow" };
  }

  /**
   * Create chore template AND assignment in one step (simplified)
   */
  async createChoreWithTemplate(
    name: string,
    description: string,
    points: number,
    assignedToProfileId: string,
    familyId: string,
    createdByProfileId: string,
    dueDate: string,
    category: string = "household",
    familyEventId?: string | null
  ): Promise<{ success: boolean; assignment?: ChoreAssignment; error?: string }> {
    try {
      // First create the template
      const { data: template, error: templateError } = await this.client
        .schema("choretracker")
        .from("chore_templates")
        .insert({
          family_id: familyId,
          name,
          description,
          points,
          category,
          icon: "📋",
          is_active: true,
          is_deleted: false,
          is_recurring: false,
          created_by_profile_id: createdByProfileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (templateError) {
        console.error("Error creating chore template:", templateError);
        return { success: false, error: "Failed to create chore template" };
      }

      // Then create the assignment
      const { data: assignment, error: assignmentError } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .insert({
          family_id: familyId,
          chore_template_id: template.id,
          assigned_to_profile_id: assignedToProfileId,
          assigned_date: new Date().toISOString().split("T")[0],
          due_date: dueDate,
          status: "pending",
          point_value: points,
          assigned_by_profile_id: createdByProfileId,
          created_by_profile_id: createdByProfileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          family_event_id: familyEventId || null,
        })
        .select(`
          *,
          chore_template:chore_templates(*)
        `)
        .single();

      if (assignmentError) {
        console.error("Error creating chore assignment:", assignmentError);
        return { success: false, error: "Failed to create chore assignment" };
      }

      return { success: true, assignment };
    } catch (error) {
      console.error("Error in createChoreWithTemplate:", error);
      return { success: false, error: "Internal error" };
    }
  }

  /**
   * Get family analytics (savings + earned by period)
   * Returns all family members with their savings and points earned
   * Periods: Week, Month, YTD (Year to Date), All Time
   * @param pointsPerDollar - Conversion rate from session (avoids extra DB query)
   */
  async getFamilyAnalytics(familyId: string, pointsPerDollar: number = 1): Promise<{
    members: Array<{
      id: string;
      name: string;
      role: string;
      savings: number;
      savings_dollars: number;
      earned_week: number;
      earned_month: number;
      earned_ytd: number;
      earned_all_time: number;
    }>;
    totals: {
      earned_week: number;
      earned_month: number;
      earned_ytd: number;
      earned_all_time: number;
    };
  }> {
    const { data, error } = await this.client.rpc("get_family_analytics", {
      p_family_id: familyId,
    });

    // If RPC doesn't exist, fall back to direct query
    // Error codes: 42883 (PostgreSQL), PGRST202 (PostgREST/Supabase)
    if (error?.code === "42883" || error?.code === "PGRST202") {
      // Function does not exist - use direct query
      interface MemberRow { id: string; name: string; role: string; current_points: number; }
      interface TxRow { profile_id: string; points_change: number; created_at: string; }

      const { data: members, error: membersError } = await this.client
        .from("family_profiles")
        .select("id, name, role, current_points")
        .eq("family_id", familyId)
        .eq("is_deleted", false)
        .order("current_points", { ascending: false });

      if (membersError) {
        console.error("Error fetching family members for analytics:", membersError);
        return { members: [], totals: { earned_week: 0, earned_month: 0, earned_ytd: 0, earned_all_time: 0 } };
      }

      // Get transactions for period calculations
      const { data: transactions, error: txError } = await this.client
        .schema("choretracker")
        .from("chore_transactions")
        .select("profile_id, points_change, created_at")
        .eq("family_id", familyId)
        .gt("points_change", 0);

      if (txError) {
        console.error("Error fetching transactions for analytics:", txError);
      }

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ytdStart = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year

      const typedMembers = (members || []) as MemberRow[];
      const typedTx = (transactions || []) as TxRow[];

      const memberAnalytics = typedMembers.map((member: MemberRow) => {
        const memberTx = typedTx.filter((tx: TxRow) => tx.profile_id === member.id);

        const earned_week = memberTx
          .filter((tx: TxRow) => new Date(tx.created_at) >= weekStart)
          .reduce((sum: number, tx: TxRow) => sum + tx.points_change, 0);

        const earned_month = memberTx
          .filter((tx: TxRow) => new Date(tx.created_at) >= monthStart)
          .reduce((sum: number, tx: TxRow) => sum + tx.points_change, 0);

        const earned_ytd = memberTx
          .filter((tx: TxRow) => new Date(tx.created_at) >= ytdStart)
          .reduce((sum: number, tx: TxRow) => sum + tx.points_change, 0);

        const earned_all_time = memberTx
          .reduce((sum: number, tx: TxRow) => sum + tx.points_change, 0);

        return {
          id: member.id,
          name: member.name,
          role: member.role,
          savings: member.current_points || 0,
          savings_dollars: Math.round((member.current_points || 0) / pointsPerDollar * 100) / 100,
          earned_week,
          earned_month,
          earned_ytd,
          earned_all_time,
        };
      });

      const totals = {
        earned_week: memberAnalytics.reduce((sum: number, m) => sum + m.earned_week, 0),
        earned_month: memberAnalytics.reduce((sum: number, m) => sum + m.earned_month, 0),
        earned_ytd: memberAnalytics.reduce((sum: number, m) => sum + m.earned_ytd, 0),
        earned_all_time: memberAnalytics.reduce((sum: number, m) => sum + m.earned_all_time, 0),
      };

      return { members: memberAnalytics, totals };
    }

    if (error) {
      console.error("Error fetching family analytics:", error);
      return { members: [], totals: { earned_week: 0, earned_month: 0, earned_ytd: 0, earned_all_time: 0 } };
    }

    const members = data || [];
    const totals = {
      earned_week: members.reduce((sum: number, m: any) => sum + (m.earned_week || 0), 0),
      earned_month: members.reduce((sum: number, m: any) => sum + (m.earned_month || 0), 0),
      earned_ytd: members.reduce((sum: number, m: any) => sum + (m.earned_ytd || 0), 0),
      earned_all_time: members.reduce((sum: number, m: any) => sum + (m.earned_all_time || 0), 0),
    };

    return { members, totals };
  }

  /**
   * Check if family weekly goal is reached and award bonus
   * Called after each chore completion
   */
  async checkFamilyGoal(familyId: string): Promise<{
    achieved: boolean;
    bonus?: number;
    progress?: number;
    target?: number;
    alreadyAwarded?: boolean;
  }> {
    // Get family settings from JSONB
    const { data: family, error: familyError } = await this.client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (familyError || !family) {
      console.error("Error fetching family settings for goal check:", familyError);
      return { achieved: false };
    }

    const settings = family.settings?.apps?.choregami || {};
    const goal = settings.weekly_goal;
    const bonus = settings.goal_bonus || 2;

    // No goal set = disabled
    if (!goal) {
      return { achieved: false };
    }

    // Get week start (Sunday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get week earnings from transactions
    const { data: txns, error: txError } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("points_change")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", weekStart.toISOString())
      .gt("points_change", 0);

    if (txError) {
      console.error("Error fetching week transactions:", txError);
      return { achieved: false };
    }

    const pointsPerDollar = settings.points_per_dollar || 1;
    const earnedPoints = txns?.reduce((sum: number, t: any) => sum + t.points_change, 0) || 0;
    const earnedDollars = Math.round(earnedPoints / pointsPerDollar);

    // Check if already awarded this week
    const { data: awarded, error: awardError } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("id")
      .eq("family_id", familyId)
      .eq("transaction_type", "bonus_awarded")
      .gte("created_at", weekStart.toISOString())
      .ilike("description", "%weekly_goal%")
      .limit(1);

    if (awardError) {
      console.error("Error checking for existing award:", awardError);
    }

    // Already awarded this week
    if (awarded && awarded.length > 0) {
      return {
        achieved: true,
        bonus,
        progress: earnedDollars,
        target: goal,
        alreadyAwarded: true
      };
    }

    // Goal reached and not yet awarded - award bonus to all members
    if (earnedDollars >= goal) {
      console.log(`🎯 Family goal reached! $${earnedDollars}/$${goal} - awarding $${bonus} bonus to all members`);

      const members = await this.getFamilyMembers(familyId);
      const bonusPoints = bonus * pointsPerDollar;

      // Import TransactionService dynamically to avoid circular dependency
      const { TransactionService } = await import("./transaction-service.ts");
      const transactionService = new TransactionService();

      for (const member of members) {
        try {
          await transactionService.recordBonusAward(
            member.id,
            bonusPoints,
            "weekly_goal",
            familyId
          );
          console.log(`✅ Bonus awarded to ${member.name}: +${bonusPoints} pts`);
        } catch (error) {
          console.error(`Failed to award bonus to ${member.name}:`, error);
        }
      }

      // Send email notification to parents (non-blocking)
      const { data: familyData } = await this.client
        .from("families")
        .select("name")
        .eq("id", familyId)
        .single();

      notifyGoalAchieved(
        familyId,
        familyData?.name || "Your Family",
        goal,
        bonus,
        members.map(m => m.name)
      ).catch(err => console.warn("⚠️ Goal email failed (non-critical):", err));

      return { achieved: true, bonus, progress: earnedDollars, target: goal };
    }

    // Goal not yet reached
    return { achieved: false, progress: earnedDollars, target: goal };
  }

  /**
   * Get family goal status (for display in FamilyReports)
   */
  async getFamilyGoalStatus(familyId: string): Promise<{
    enabled: boolean;
    target: number;
    progress: number;
    bonus: number;
    achieved: boolean;
  } | null> {
    // Get family settings
    const { data: family, error } = await this.client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (error || !family) {
      return null;
    }

    const settings = family.settings?.apps?.choregami || {};
    const goal = settings.weekly_goal;
    const bonus = settings.goal_bonus || 2;

    if (!goal) {
      return null; // Goal not enabled
    }

    // Get week start
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get week earnings
    const { data: txns } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("points_change")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", weekStart.toISOString())
      .gt("points_change", 0);

    const pointsPerDollar = settings.points_per_dollar || 1;
    const earnedPoints = txns?.reduce((sum: number, t: any) => sum + t.points_change, 0) || 0;
    const progress = Math.round(earnedPoints / pointsPerDollar);

    // Check if already achieved this week
    const { data: awarded } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("id")
      .eq("family_id", familyId)
      .eq("transaction_type", "bonus_awarded")
      .gte("created_at", weekStart.toISOString())
      .ilike("description", "%weekly_goal%")
      .limit(1);

    return {
      enabled: true,
      target: goal,
      progress,
      bonus,
      achieved: (awarded && awarded.length > 0) || progress >= goal,
    };
  }

  /**
   * Get weekly activity patterns for the family (last 60 days)
   * Shows which days of the week are most active per kid
   */
  async getWeeklyPatterns(familyId: string): Promise<{
    familyBusiestDay: { day: string; count: number } | null;
    familySlowestDays: string[];
    byPerson: Array<{
      name: string;
      total: number;
      topDays: string[];
      heatmap: number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    }>;
  }> {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Query transactions (choretracker schema)
    const { data: txData, error: txError } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, points_change, created_at")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gt("points_change", 0)
      .gte("created_at", sixtyDaysAgo.toISOString());

    if (txError || !txData || txData.length === 0) {
      return { familyBusiestDay: null, familySlowestDays: [], byPerson: [] };
    }

    // Get child profiles separately (public schema)
    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name, role")
      .eq("family_id", familyId)
      .eq("role", "child");

    if (!profiles || profiles.length === 0) {
      return { familyBusiestDay: null, familySlowestDays: [], byPerson: [] };
    }

    // Create profile map (only children)
    const childProfileMap = new Map<string, string>(profiles.map((p: any) => [p.id, p.name]));
    const childIds = new Set<string>(profiles.map((p: any) => p.id));

    // Filter transactions to only include children
    const data = txData.filter((tx: any) => childIds.has(tx.profile_id));

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (data.length === 0) {
      return { familyBusiestDay: null, familySlowestDays: [], byPerson: [] };
    }

    // Aggregate by person and day
    const personDayMap = new Map<string, Map<number, number>>();
    const familyDayTotals = new Array(7).fill(0);

    for (const tx of data as any[]) {
      const name = childProfileMap.get(tx.profile_id) || "Unknown";
      const dayNum = new Date(tx.created_at).getDay();

      if (!personDayMap.has(name)) {
        personDayMap.set(name, new Map());
      }
      const dayMap = personDayMap.get(name)!;
      dayMap.set(dayNum, (dayMap.get(dayNum) || 0) + 1);
      familyDayTotals[dayNum]++;
    }

    // Find family busiest day
    const maxCount = Math.max(...familyDayTotals);
    const busiestDayNum = familyDayTotals.indexOf(maxCount);
    const familyBusiestDay = maxCount > 0
      ? { day: dayNames[busiestDayNum], count: maxCount }
      : null;

    // Find slowest days (could be multiple if tied)
    const minCount = Math.min(...familyDayTotals);
    const familySlowestDays = dayNames.filter((_, i) => familyDayTotals[i] === minCount);

    // Build per-person data
    const byPerson: Array<{
      name: string;
      total: number;
      topDays: string[];
      heatmap: number[];
    }> = [];

    for (const [name, dayMap] of personDayMap) {
      const heatmap = new Array(7).fill(0);
      let total = 0;

      for (const [dayNum, count] of dayMap) {
        heatmap[dayNum] = count;
        total += count;
      }

      // Find top 2 days
      const sortedDays = [...dayMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([dayNum]) => dayNames[dayNum]);

      byPerson.push({ name, total, topDays: sortedDays, heatmap });
    }

    // Sort by total descending
    byPerson.sort((a, b) => b.total - a.total);

    return { familyBusiestDay, familySlowestDays, byPerson };
  }

  /**
   * Get goals achieved (reward redemptions) from the past year
   * Aggregated by person for card-style display
   * Positive framing for "spending" - shows what kids achieved with their points
   */
  async getGoalsAchieved(familyId: string): Promise<{
    byPerson: Array<{
      name: string;
      totalPoints: number;
      rewardCount: number;
    }>;
    familyTotal: {
      totalPoints: number;
      rewardCount: number;
    };
  }> {
    // Get redemption transactions from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: transactions, error: txError } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, points_change, description, created_at")
      .eq("family_id", familyId)
      .in("transaction_type", ["reward_redemption", "cash_out"])
      .gte("created_at", oneYearAgo.toISOString())
      .order("created_at", { ascending: false });

    const emptyResult = { byPerson: [], familyTotal: { totalPoints: 0, rewardCount: 0 } };

    if (txError) {
      console.error("Error fetching goals achieved:", txError);
      return emptyResult;
    }

    if (!transactions || transactions.length === 0) {
      return emptyResult;
    }

    interface TxRow { profile_id: string; points_change: number; }
    interface ProfileRow { id: string; name: string; }

    const typedTx = transactions as TxRow[];

    // Get profile names
    const profileIds = [...new Set(typedTx.map((tx: TxRow) => tx.profile_id))];
    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name")
      .in("id", profileIds);

    const typedProfiles = (profiles || []) as ProfileRow[];
    const profileMap = new Map(typedProfiles.map((p: ProfileRow) => [p.id, p.name]));

    // Aggregate by person
    const personAggregates = new Map<string, { name: string; totalPoints: number; rewardCount: number }>();

    for (const tx of typedTx) {
      const name = profileMap.get(tx.profile_id) || "Unknown";
      const points = Math.abs(tx.points_change);

      if (personAggregates.has(name)) {
        const existing = personAggregates.get(name)!;
        existing.totalPoints += points;
        existing.rewardCount += 1;
      } else {
        personAggregates.set(name, { name, totalPoints: points, rewardCount: 1 });
      }
    }

    // Sort by total points descending
    const byPerson = Array.from(personAggregates.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate family total
    const familyTotal = {
      totalPoints: byPerson.reduce((sum, p) => sum + p.totalPoints, 0),
      rewardCount: byPerson.reduce((sum, p) => sum + p.rewardCount, 0),
    };

    return { byPerson, familyTotal };
  }

  // ===== Kid Management Methods =====

  /**
   * Count active (non-deleted) kids in a family
   */
  async getKidCount(familyId: string): Promise<number> {
    const { count, error } = await this.client
      .from("family_profiles")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("role", "child")
      .eq("is_deleted", false);

    if (error) {
      console.error("Error counting kids:", error);
      return 0;
    }
    return count || 0;
  }

  /**
   * Add a new kid to a family (max 8)
   */
  async addKid(familyId: string, name: string): Promise<FamilyProfile | null> {
    const count = await this.getKidCount(familyId);
    if (count >= 8) {
      console.error("Family already has maximum 8 kids");
      return null;
    }

    const { data, error } = await this.client
      .from("family_profiles")
      .insert({
        family_id: familyId,
        name: name.trim(),
        role: "child",
        current_points: 0,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding kid:", error);
      return null;
    }
    return data;
  }

  /**
   * Update a kid's name
   */
  async updateKidName(kidId: string, name: string): Promise<boolean> {
    const { error } = await this.client
      .from("family_profiles")
      .update({ name: name.trim() })
      .eq("id", kidId)
      .eq("role", "child")
      .eq("is_deleted", false);

    if (error) {
      console.error("Error updating kid name:", error);
      return false;
    }
    return true;
  }

  /**
   * Soft delete a kid (mark as deleted, preserve data)
   */
  async softDeleteKid(kidId: string): Promise<boolean> {
    const { error } = await this.client
      .from("family_profiles")
      .update({ is_deleted: true })
      .eq("id", kidId)
      .eq("role", "child");

    if (error) {
      console.error("Error soft deleting kid:", error);
      return false;
    }
    return true;
  }
}

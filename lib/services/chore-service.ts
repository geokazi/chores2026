/**
 * Chore Service for ChoreGami 2026
 * Basic CRUD operations for chores and assignments using existing database tables
 */

import { createClient } from "@supabase/supabase-js";

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
  children_pins_enabled: boolean;
  // Add other family fields as needed
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
   */
  async getTodaysChores(
    profileId: string,
    familyId: string,
  ): Promise<ChoreAssignment[]> {
    // Get chores that are available today:
    // - Recurring chores: only if due today
    // - One-time chores: if due today or overdue
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayStartStr = todayStart.toISOString();
    const todayEndStr = todayEnd.toISOString();

    // Get all pending chores for this user
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates!inner(*)
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

    // Filter chores based on type and due date
    const filteredChores = (data || []).filter(chore => {
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
      ...assignments.map(a => a.assigned_to_profile_id).filter(Boolean),
      ...assignments.map(a => a.completed_by_profile_id).filter(Boolean),
    ])];

    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name")
      .in("id", profileIds);

    // Map profiles to assignments
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return assignments.map(assignment => ({
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
    const profileIds = [...new Set(assignments.map(a => a.assigned_to_profile_id).filter(Boolean))];

    const { data: profiles } = await this.client
      .from("family_profiles")
      .select("id, name, role")
      .in("id", profileIds);

    // Map profiles to assignments
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return assignments.map(assignment => ({
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
      const pinHash = await bcrypt.hash(pin, 10);
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
   * Update member points (add/subtract)
   */
  async updateMemberPoints(
    memberId: string,
    pointAdjustment: number,
  ): Promise<boolean> {
    // First get current points
    const { data: member, error: fetchError } = await this.client
      .from("family_profiles")
      .select("current_points")
      .eq("id", memberId)
      .single();

    if (fetchError) {
      console.error("Error fetching member for point update:", fetchError);
      return false;
    }

    const newPoints = Math.max(
      0,
      (member.current_points || 0) + pointAdjustment,
    );

    const { error } = await this.client
      .from("family_profiles")
      .update({ current_points: newPoints })
      .eq("id", memberId);

    if (error) {
      console.error("Error updating member points:", error);
      return false;
    }

    return true;
  }

  /**
   * Set kid PIN hash
   */
  async setKidPin(kidId: string, pinHash: string): Promise<boolean> {
    const { error } = await this.client
      .from("family_profiles")
      .update({ pin_hash: pinHash })
      .eq("id", kidId)
      .eq("role", "child");

    if (error) {
      console.error("Error setting kid PIN:", error);
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
}

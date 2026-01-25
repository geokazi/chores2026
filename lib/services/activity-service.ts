/**
 * Activity Service
 * Logs and retrieves family activity for the activity feed.
 * Uses JSONB payload for flexibility - no schema changes needed for new activity types.
 */

import { getServiceSupabaseClient } from "../supabase.ts";

// Activity types
export type ActivityType =
  | "chore_completed"
  | "chore_created"
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "prep_task_added"
  | "prep_task_completed"
  | "linked_chore_created"
  | "point_adjustment"
  | "cash_out"
  | "reward_claimed";

// Target types for polymorphic references
export type TargetType = "chore" | "event" | "prep_task" | "chore_assignment";

export interface ActivityTarget {
  type: TargetType;
  id: string;
  name: string;
}

export interface ActivityInput {
  familyId: string;
  actorId: string;
  actorName: string;
  type: ActivityType;
  title: string;
  icon?: string;
  target?: ActivityTarget;
  points?: number;
  meta?: Record<string, unknown>;
}

export interface Activity {
  id: string;
  family_id: string;
  created_at: string;
  data: {
    v: number;
    type: ActivityType;
    actor_id: string;
    actor_name: string;
    icon: string;
    title: string;
    target?: ActivityTarget;
    points?: number;
    meta?: Record<string, unknown>;
  };
}

// Icon mapping for activity types
const DEFAULT_ICONS: Record<ActivityType, string> = {
  chore_completed: "✅",
  chore_created: "📋",
  event_created: "📅",
  event_updated: "✏️",
  event_deleted: "🗑️",
  prep_task_added: "📝",
  prep_task_completed: "☑️",
  linked_chore_created: "🔗",
  point_adjustment: "⚙️",
  cash_out: "💵",
  reward_claimed: "🎁",
};

export class ActivityService {
  private client;

  constructor() {
    // Use service client - has INSERT permissions via RLS policy
    this.client = getServiceSupabaseClient();
  }

  /**
   * Log an activity to the feed
   */
  async logActivity(input: ActivityInput): Promise<void> {
    const data = {
      v: 1, // Schema version for future migrations
      type: input.type,
      actor_id: input.actorId,
      actor_name: input.actorName,
      icon: input.icon || DEFAULT_ICONS[input.type] || "📌",
      title: input.title,
      target: input.target,
      points: input.points,
      meta: input.meta,
    };

    console.log("🔍 Attempting to log activity:", {
      family_id: input.familyId,
      type: input.type,
      actor: input.actorName,
    });

    const { data: result, error } = await this.client
      .schema("choretracker")
      .from("family_activity")
      .insert({
        family_id: input.familyId,
        data,
      })
      .select();

    if (error) {
      console.error("❌ Failed to log activity:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // Non-blocking - don't throw, activity feed is not critical
    } else {
      console.log(`✅ Activity logged successfully: ${input.type} - ${input.title}`, result);
    }
  }

  /**
   * Get recent activity for a family
   */
  async getRecentActivity(
    familyId: string,
    limit: number = 20
  ): Promise<Activity[]> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("family_activity")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Failed to fetch activity:", error);
      return [];
    }

    return (data || []) as Activity[];
  }

  /**
   * Get activity filtered by type
   */
  async getActivityByType(
    familyId: string,
    types: ActivityType[],
    limit: number = 20
  ): Promise<Activity[]> {
    // Use JSONB filter
    const { data, error } = await this.client
      .schema("choretracker")
      .from("family_activity")
      .select("*")
      .eq("family_id", familyId)
      .in("data->type", types)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Failed to fetch activity by type:", error);
      return [];
    }

    return (data || []) as Activity[];
  }

  /**
   * Clean up old activity (call periodically)
   */
  async cleanupOldActivity(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await this.client
      .schema("choretracker")
      .from("family_activity")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("❌ Failed to cleanup old activity:", error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`🧹 Cleaned up ${count} old activity records`);
    }
    return count;
  }
}

// Singleton instance
let activityServiceInstance: ActivityService | null = null;

export function getActivityService(): ActivityService {
  if (!activityServiceInstance) {
    activityServiceInstance = new ActivityService();
  }
  return activityServiceInstance;
}

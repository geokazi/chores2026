/**
 * Demand Signals API
 * GET /api/admin/demand-signals
 * Staff-only: Aggregated demand signal metrics for product decisions
 * ~150 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../lib/auth/staff.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

interface UsageMetrics {
  metric: string;
  total_users: number;
  total_events: number;
  last_7_days: number;
  last_30_days: number;
}

export const handler: Handlers = {
  async GET(req) {
    // 1. Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Check staff access
    if (!isStaffEmail(session.user.email)) {
      console.log(`Unauthorized demand-signals access attempt by ${session.user.email}`);
      return Response.json({
        error: "Staff access required",
        authorized_domains: ["@choregami.com", "@choregami.app", "@probuild365.com"],
      }, { status: 403 });
    }

    const supabase = getServiceSupabaseClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      // 3. Get usage tracker metrics from family_profiles (exclude deleted)
      const { data: profiles } = await supabase
        .from("family_profiles")
        .select("id, preferences")
        .not("preferences", "is", null)
        .or("is_deleted.is.null,is_deleted.eq.false");

      // Aggregate usage metrics
      const usageMetrics: Record<string, { users: Set<string>; total: number }> = {};
      const trackedMetrics = ["ics", "badges", "digests", "prep_shop", "prep_export"];

      for (const metric of trackedMetrics) {
        usageMetrics[metric] = { users: new Set(), total: 0 };
      }

      for (const profile of profiles || []) {
        const usage = profile.preferences?.notifications?.usage || {};
        for (const metric of trackedMetrics) {
          const totalKey = `total_${metric}_sent`;
          const count = usage[totalKey] || 0;
          if (count > 0) {
            usageMetrics[metric].users.add(profile.id);
            usageMetrics[metric].total += count;
          }
        }
      }

      // 4. Get demand_signals table data (assessment/landing page signals)
      const { data: demandSignals } = await supabase
        .from("demand_signals")
        .select("feature, created_at");

      // Group by feature
      const signalsByFeature: Record<string, { total: number; last7: number; last30: number }> = {};
      for (const signal of demandSignals || []) {
        const feature = signal.feature || "unknown";
        if (!signalsByFeature[feature]) {
          signalsByFeature[feature] = { total: 0, last7: 0, last30: 0 };
        }
        signalsByFeature[feature].total++;
        if (signal.created_at >= sevenDaysAgo) {
          signalsByFeature[feature].last7++;
        }
        if (signal.created_at >= thirtyDaysAgo) {
          signalsByFeature[feature].last30++;
        }
      }

      // 5. Get feature demand from family_activity (logged demand clicks)
      const { data: activityDemand } = await supabase
        .schema("choretracker")
        .from("family_activity")
        .select("data, created_at")
        .not("data->meta->demand_feature", "is", null);

      const featureDemand: Record<string, { total: number; last7: number; last30: number }> = {};
      for (const activity of activityDemand || []) {
        const feature = activity.data?.meta?.demand_feature || "unknown";
        if (!featureDemand[feature]) {
          featureDemand[feature] = { total: 0, last7: 0, last30: 0 };
        }
        featureDemand[feature].total++;
        if (activity.created_at >= sevenDaysAgo) {
          featureDemand[feature].last7++;
        }
        if (activity.created_at >= thirtyDaysAgo) {
          featureDemand[feature].last30++;
        }
      }

      // 6. Format response
      const usageMetricsFormatted: UsageMetrics[] = trackedMetrics.map((metric) => ({
        metric,
        total_users: usageMetrics[metric].users.size,
        total_events: usageMetrics[metric].total,
        last_7_days: 0, // Would need timestamp tracking for this
        last_30_days: 0,
      }));

      const demandSignalsFormatted = Object.entries(signalsByFeature).map(([feature, stats]) => ({
        feature,
        ...stats,
      }));

      const featureDemandFormatted = Object.entries(featureDemand).map(([feature, stats]) => ({
        feature,
        ...stats,
      }));

      // 7. Get total families and profiles for context (exclude deleted)
      const { count: totalFamilies } = await supabase
        .from("families")
        .select("*", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false");

      const { count: totalProfiles } = await supabase
        .from("family_profiles")
        .select("*", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false");

      return Response.json({
        overview: {
          total_families: totalFamilies || 0,
          total_profiles: totalProfiles || 0,
        },
        usage_metrics: usageMetricsFormatted,
        demand_signals: demandSignalsFormatted,
        feature_demand: featureDemandFormatted,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching demand signals:", error);
      return Response.json({ error: "Failed to fetch demand signals" }, { status: 500 });
    }
  },
};

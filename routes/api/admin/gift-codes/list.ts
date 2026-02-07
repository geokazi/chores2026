/**
 * Gift Code List API
 * GET /api/admin/gift-codes/list
 * Staff-only: List gift codes with filtering
 * ~100 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";

interface GiftCodeRecord {
  code: string;
  plan_type: string;
  message: string | null;
  purchased_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  redeemer_email?: string | null;
  expires_at?: string | null;
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
      console.log(`Unauthorized admin access attempt by ${session.user.email}`);
      return Response.json({
        error: "Staff access required",
        authorized_domains: ["@choregami.com", "@choregami.app", "@probuild365.com"],
      }, { status: 403 });
    }

    // 3. Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all"; // all, pending, redeemed
    const planType = url.searchParams.get("plan_type"); // optional filter
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Build query
    const supabase = getServiceSupabaseClient();
    let query = supabase
      .from("gift_codes")
      .select("code, plan_type, message, purchased_at, redeemed_by, redeemed_at")
      .order("purchased_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status === "pending") {
      query = query.is("redeemed_by", null);
    } else if (status === "redeemed") {
      query = query.not("redeemed_by", "is", null);
    }

    // Apply plan type filter
    if (planType && ["summer", "school_year", "full_year"].includes(planType)) {
      query = query.eq("plan_type", planType);
    }

    // 5. Execute query
    const { data: codes, error, count } = await query;

    if (error) {
      console.error("Error fetching gift codes:", error);
      return Response.json({ error: "Failed to fetch codes" }, { status: 500 });
    }

    // 5b. Enrich redeemed codes with family info (email + expiry)
    const enrichedCodes: GiftCodeRecord[] = codes || [];
    const redeemedFamilyIds = enrichedCodes
      .filter(c => c.redeemed_by)
      .map(c => c.redeemed_by!);

    if (redeemedFamilyIds.length > 0) {
      // Get family settings (for expiry) and parent emails
      const [familiesResult, profilesResult] = await Promise.all([
        supabase
          .from("families")
          .select("id, settings")
          .in("id", redeemedFamilyIds),
        supabase
          .from("family_profiles")
          .select("family_id, user_id")
          .in("family_id", redeemedFamilyIds)
          .not("user_id", "is", null),
      ]);

      // Build lookup maps
      const familySettings = new Map<string, Record<string, unknown>>();
      (familiesResult.data || []).forEach((f: { id: string; settings: Record<string, unknown> }) => {
        familySettings.set(f.id, f.settings);
      });

      const familyUserIds = new Map<string, string>();
      (profilesResult.data || []).forEach((p: { family_id: string; user_id: string | null }) => {
        if (p.user_id) familyUserIds.set(p.family_id, p.user_id);
      });

      // Get emails from auth.users (requires service role)
      const userIds = [...new Set(familyUserIds.values())];
      const userEmails = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: { users } } = await supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        if (users) {
          users.forEach((u: { id: string; email?: string }) => {
            if (u.email) userEmails.set(u.id, u.email);
          });
        }
      }

      // Enrich codes with email and expiry
      enrichedCodes.forEach(code => {
        if (code.redeemed_by) {
          // Get expiry from family settings
          const settings = familySettings.get(code.redeemed_by) as Record<string, unknown> | undefined;
          const apps = settings?.apps as Record<string, unknown> | undefined;
          const choregami = apps?.choregami as Record<string, unknown> | undefined;
          const plan = choregami?.plan as Record<string, unknown> | undefined;
          code.expires_at = (plan?.expires_at as string) || null;

          // Get email via user_id
          const userId = familyUserIds.get(code.redeemed_by);
          code.redeemer_email = userId ? userEmails.get(userId) || null : null;
        }
      });
    }

    // 6. Get total counts for each status
    const [pendingResult, redeemedResult] = await Promise.all([
      supabase
        .from("gift_codes")
        .select("code", { count: "exact", head: true })
        .is("redeemed_by", null),
      supabase
        .from("gift_codes")
        .select("code", { count: "exact", head: true })
        .not("redeemed_by", "is", null),
    ]);

    return Response.json({
      codes: enrichedCodes,
      pagination: {
        limit,
        offset,
        total: (pendingResult.count || 0) + (redeemedResult.count || 0),
      },
      summary: {
        pending: pendingResult.count || 0,
        redeemed: redeemedResult.count || 0,
      },
      filters: {
        status,
        plan_type: planType,
      },
    });
  },
};

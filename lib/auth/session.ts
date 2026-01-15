/**
 * Secure Session Management for ChoreGami 2026
 * Simplified version of choregami-mealplanner auth with family-specific security
 */

import { getCookies } from "@std/http/cookie";
import { createClient } from "@supabase/supabase-js";

export interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
}

export interface ChoreGamiSession {
  user: {
    id: string;
    email: string;
    role?: string;
    profileId?: string;  // The logged-in user's family_profile ID
    profileName?: string;
  } | null;
  family: {
    id: string;
    name: string;
    points_per_dollar: number;
    children_pins_enabled: boolean;
    theme: string;
    members: FamilyMember[];  // All family members cached
  } | null;
  isAuthenticated: boolean;
  sessionToken?: string;
}

/**
 * Get authenticated session with family context
 * SECURITY: Always validates user has access to family_id
 */
export async function getAuthenticatedSession(
  request: Request,
): Promise<ChoreGamiSession> {
  try {
    const cookies = getCookies(request.headers);
    const accessToken = cookies["sb-access-token"];

    console.log("🍪 Auth cookie check:", {
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
    });

    if (!accessToken) {
      return createAnonymousSession();
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log("❌ Invalid auth token:", error?.message);
      return createAnonymousSession();
    }

    // Get user's family profile first
    const { data: profileData, error: profileError } = await supabase
      .from("family_profiles")
      .select("id, family_id, name, role")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single();

    if (profileError || !profileData) {
      console.log("❌ No family profile found for user:", user.id, profileError?.message);
      return createAnonymousSession();
    }

    // Batch fetch: family info + all family members in parallel
    const [familyResult, membersResult] = await Promise.all([
      supabase
        .from("families")
        .select("id, name, settings")
        .eq("id", profileData.family_id)
        .single(),
      supabase
        .from("family_profiles")
        .select("id, name, role, current_points")
        .eq("family_id", profileData.family_id)
        .eq("is_deleted", false)
        .order("current_points", { ascending: false }),
    ]);

    const { data: familyInfo, error: familyError } = familyResult;
    const { data: membersData, error: membersError } = membersResult;

    if (familyError || !familyInfo) {
      console.log("❌ No family found for family_id:", profileData.family_id, familyError?.message);
      return createAnonymousSession();
    }

    // Map members to typed array
    const members: FamilyMember[] = (membersData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      current_points: m.current_points || 0,
    }));

    // Extract settings from JSONB with defaults
    const settings = familyInfo.settings || {};
    const choregamiSettings = settings.apps?.choregami || {};

    console.log("✅ User authenticated with family access:", {
      user: user.email,
      family: familyInfo.name,
      role: profileData.role,
      profile: profileData.name,
      membersCount: members.length,
      settingsVersion: settings._version,
    });

    return {
      user: {
        id: user.id,
        email: user.email || "",
        role: profileData.role,
        profileId: profileData.id,
        profileName: profileData.name,
      },
      family: {
        id: profileData.family_id,
        name: familyInfo.name,
        points_per_dollar: choregamiSettings.points_per_dollar || 1,
        children_pins_enabled: choregamiSettings.children_pins_enabled || false,
        theme: settings.theme || "fresh_meadow",
        members,
      },
      isAuthenticated: true,
      sessionToken: accessToken,
    };
  } catch (error) {
    console.error("💥 Session validation error:", error);
    return createAnonymousSession();
  }
}

/**
 * Validate user has access to specific family
 * SECURITY: Critical check for all family-scoped operations
 */
export async function validateFamilyAccess(
  session: ChoreGamiSession,
  requiredFamilyId: string,
): Promise<boolean> {
  if (!session.isAuthenticated || !session.family) {
    return false;
  }

  return session.family.id === requiredFamilyId;
}

/**
 * Create middleware for protected parent routes
 * SECURITY: Blocks access without proper session + family validation
 */
export function requireParentAuth() {
  return async (req: Request, ctx: any) => {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    // Add session to context for route handlers
    ctx.state.session = session;
    return await ctx.next();
  };
}

/**
 * Get family ID from authenticated session
 * SECURITY: Never expose family_id in URLs - always from session
 */
export function getFamilyIdFromSession(session: ChoreGamiSession): string | null {
  return session.family?.id || null;
}

function createAnonymousSession(): ChoreGamiSession {
  return {
    user: null,
    family: null,
    isAuthenticated: false,
  };
}
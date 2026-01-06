/**
 * Secure Session Management for ChoreGami 2026
 * Simplified version of choregami-mealplanner auth with family-specific security
 */

import { getCookies } from "@std/http/cookie";
import { createClient } from "@supabase/supabase-js";

export interface ChoreGamiSession {
  user: {
    id: string;
    email: string;
    role?: string;
  } | null;
  family: {
    id: string;
    name: string;
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

    // Get family information separately to avoid join ambiguity
    const { data: familyInfo, error: familyError } = await supabase
      .from("families")
      .select("id, name")
      .eq("id", profileData.family_id)
      .single();

    if (familyError || !familyInfo) {
      console.log("❌ No family found for family_id:", profileData.family_id, familyError?.message);
      return createAnonymousSession();
    }

    console.log("✅ User authenticated with family access:", {
      user: user.email,
      family: familyInfo.name,
      role: profileData.role,
      profile: profileData.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email || "",
        role: profileData.role,
      },
      family: {
        id: profileData.family_id,
        name: familyInfo.name,
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
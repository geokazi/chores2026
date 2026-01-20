/**
 * Centralized Supabase client management with lazy initialization
 * Prevents build-time failures when environment variables are not available
 * Based on fresh-auth reference implementation
 */

import {
  createClient as createSupabaseClient,
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  user_tier: "anonymous" | "authenticated" | "premium";
  created_at: string;
  subscription_status?: "active" | "canceled" | "past_due";
  subscription_end_date?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

// Cache for different client types
let _anonClient: SupabaseClient | null = null;
let _serviceClient: any | null = null;

/**
 * Get the anonymous Supabase client (uses SUPABASE_KEY)
 * For user authentication and standard operations
 */
export function getSupabaseClient(): SupabaseClient {
  if (_anonClient) {
    return _anonClient;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables",
    );
  }

  // Check if using dummy values (development mode)
  if (supabaseUrl.includes("dummy") || supabaseKey.includes("dummy")) {
    throw new Error("Supabase not configured for production use");
  }

  _anonClient = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return _anonClient;
}

/**
 * Get the service role Supabase client (uses SUPABASE_SERVICE_ROLE_KEY)
 * For admin operations like analytics tracking and user management
 */
export function getServiceSupabaseClient(): any {
  if (_serviceClient) {
    return _serviceClient;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  _serviceClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceClient;
}

/**
 * Create a Supabase client with custom options
 */
export function createClient(options?: any): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables",
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, options);
}

/**
 * Check if Supabase is properly configured
 */
export function isConfigured(): boolean {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_KEY");

  return !!(supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("dummy") &&
    !supabaseKey.includes("dummy"));
}

/**
 * Get current authenticated user
 */
export async function getUser(): Promise<User | null> {
  try {
    if (!isConfigured()) {
      return null; // Return null for development mode
    }

    const client = getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();

    if (error) {
      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Supabase getUser failed:", error);
    return null;
  }
}

/**
 * Get user profile with tier information
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    if (!isConfigured()) {
      // Return mock profile for development
      return {
        id: userId,
        email: "dev@example.com",
        user_tier: "authenticated",
        created_at: new Date().toISOString(),
      };
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting user profile:", error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error("getUserProfile failed:", error);
    return null;
  }
}

/**
 * Determine user tier from session/profile
 */
export async function getUserTier(
  request: Request,
): Promise<"anonymous" | "authenticated" | "premium"> {
  try {
    // Check for API key in header (for premium access)
    const apiKey = request.headers.get("X-API-Key");
    if (apiKey && apiKey === Deno.env.get("PREMIUM_API_KEY")) {
      return "premium";
    }

    // Check for session token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return "anonymous";
    }

    if (!isConfigured()) {
      // Development mode - return authenticated for any token
      return "authenticated";
    }

    const token = authHeader.substring(7);
    const client = getSupabaseClient();

    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return "anonymous";
    }

    // Get user profile to check tier
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return "authenticated"; // Default for valid session without profile
    }

    return profile.user_tier;
  } catch (error) {
    console.error("Error determining user tier:", error);
    return "anonymous";
  }
}

/**
 * Sign up new user
 */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error as Error | null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

/**
 * Sign in existing user
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error as Error | null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    return { error: error as Error | null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
  profile: Partial<UserProfile>,
): Promise<UserProfile | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_profiles")
      .upsert(profile)
      .select()
      .single();

    if (error) {
      console.error("Error upserting user profile:", error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error("upsertUserProfile failed:", error);
    return null;
  }
}

/**
 * Get session from request headers
 */
export async function getSessionFromRequest(
  request: Request,
): Promise<Session | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    if (!isConfigured()) {
      // Mock session for development
      return {
        access_token: authHeader.substring(7),
        refresh_token: "mock_refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "dev-user-id",
          email: "dev@example.com",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      } as Session;
    }

    const token = authHeader.substring(7);
    const client = getSupabaseClient();

    const { data: { session }, error } = await client.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error getting session from request:", error);
    return null;
  }
}

/**
 * Health check for Supabase connection
 */
export async function healthCheck(): Promise<
  { status: "ok" | "error"; configured: boolean; message: string }
> {
  try {
    const configured = isConfigured();

    if (!configured) {
      return {
        status: "ok",
        configured: false,
        message: "Supabase not configured - using development mode",
      };
    }

    const client = getSupabaseClient();

    // Test connection with a simple query
    const { error } = await client.from("user_profiles").select("count").limit(
      1,
    );

    if (error) {
      return {
        status: "error",
        configured: true,
        message: `Supabase connection failed: ${error.message}`,
      };
    }

    return {
      status: "ok",
      configured: true,
      message: "Supabase connection healthy",
    };
  } catch (error) {
    return {
      status: "error",
      configured: isConfigured(),
      message: `Supabase health check failed: ${(error as Error).message}`,
    };
  }
}

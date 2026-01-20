/**
 * Fresh-specific Supabase client utilities
 * For server-side operations in routes and middleware
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Create a server-side Supabase client for use in Fresh routes
 * This handles auth token extraction from URL or cookies
 */
export async function createServerSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables",
    );
  }

  // Extract auth token from cookies or URL
  const authToken = extractAuthToken(req);
  //console.log("Server Supabase client - Auth token:", authToken ? `${authToken.substring(0, 10)}...` : 'none');

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authToken
        ? {
          Authorization: `Bearer ${authToken}`,
        }
        : {},
    },
  });

  // If we have an auth token, configure the client properly
  if (authToken) {
    // Extract refresh token from cookies
    const cookieHeader = req.headers.get("cookie");
    let refreshToken = "";
    if (cookieHeader) {
      try {
        const cookies = Object.fromEntries(
          cookieHeader.split("; ").map((cookie) => {
            const [key, ...valueParts] = cookie.split("=");
            return [key, valueParts.join("=")];
          }),
        );
        refreshToken = cookies["sb-refresh-token"] || "";
      } catch (error) {
        console.error("Error parsing cookies for refresh token:", error);
      }
    }

    // Create a new client instance with proper auth configuration
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
          apikey: supabaseAnonKey,
        },
      },
    });

    // Try to set session if we have both tokens, otherwise just use headers
    if (refreshToken) {
      try {
        await authenticatedClient.auth.setSession({
          access_token: authToken,
          refresh_token: refreshToken,
        });
        //console.log("Session set with both tokens successfully");
        return authenticatedClient;
      } catch (error) {
        console.log("Session setting failed, using header auth:", error);
      }
    }

    //console.log("Using header-based auth - access:", authToken ? 'present' : 'missing', 'refresh:', refreshToken ? 'present' : 'missing');
    return authenticatedClient;
  }

  return client;
}

/**
 * Extract authentication token from request
 */
export function extractAuthToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  const url = new URL(req.url);

  // First try URL parameter
  let accessToken = url.searchParams.get("auth_token");

  // Then try cookies
  if (!accessToken && cookieHeader) {
    try {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((cookie) => {
          const [key, ...valueParts] = cookie.split("=");
          return [key, valueParts.join("=")];
        }),
      );
      accessToken = cookies["sb-access-token"];
    } catch (error) {
      console.error("Cookie parsing error:", error);
    }
  }

  return accessToken;
}

/**
 * Verify JWT token and extract user info
 */
export function verifyJWT(token: string): any | null {
  try {
    // Simple JWT decode (not verification, just parsing)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Add padding if needed for base64 decoding
    let payload = parts[1];
    while (payload.length % 4) {
      payload += "=";
    }

    // Replace URL-safe base64 characters
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");

    const decoded = JSON.parse(atob(payload));

    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
}

/**
 * State interface for Fresh middleware
 */
export interface State {
  userId?: string;
  user?: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    user_metadata?: any;
  };
  session?: any;
  userTier: "anonymous" | "authenticated" | "premium";
  isAuthenticated: boolean;
}

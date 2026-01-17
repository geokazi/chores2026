/**
 * Social Auth Buttons - Google and Facebook OAuth
 * Copied from mealplanner, simplified for ChoreGami
 */

import { useEffect, useState } from "preact/hooks";

function getOAuthErrorMessage(error: any, provider: "google" | "facebook"): string {
  const errorString = (error?.message || error || "").toLowerCase();
  if (errorString.includes("access_denied") || errorString.includes("cancelled")) {
    return `${provider} authentication was cancelled. Try again or use email/phone.`;
  }
  return `${provider} authentication unavailable. Please try email or phone.`;
}

interface SocialAuthButtonsProps {
  redirectTo?: string;
}

export default function SocialAuthButtons({ redirectTo }: SocialAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    async function initSupabase() {
      if (typeof window === "undefined") return;

      const supabaseUrl = (globalThis as any).SUPABASE_URL;
      const supabaseKey = (globalThis as any).SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        setError("Authentication configuration missing");
        return;
      }

      // Wait for Supabase CDN script to load
      let retries = 0;
      while (!(window as any).supabase && retries < 10) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
      }

      if (!(window as any).supabase) {
        setError("Failed to load authentication");
        return;
      }

      const { createClient } = (window as any).supabase;
      setSupabase(createClient(supabaseUrl, supabaseKey));
    }
    initSupabase();
  }, []);

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    if (!supabase) {
      setError("Authentication not ready. Please refresh.");
      return;
    }

    setIsLoading(provider);
    setError(null);

    // Pre-validate OAuth config
    try {
      const res = await fetch(`/api/auth/validate-oauth?provider=${provider}`);
      const validation = await res.json();
      if (!validation.available) {
        setError(validation.userMessage || `${provider} unavailable. Try email/phone.`);
        setIsLoading(null);
        return;
      }
    } catch {
      setError(`${provider} unavailable. Try email/phone.`);
      setIsLoading(null);
      return;
    }

    try {
      const origin = window.location.origin;
      const options: any = {
        redirectTo: redirectTo || `${origin}/`,
      };

      if (provider === "google") {
        options.queryParams = { access_type: "offline", prompt: "consent" };
        options.scopes = "email profile";
      } else {
        options.scopes = "public_profile email";
      }

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (authError) {
        setError(getOAuthErrorMessage(authError, provider));
        setIsLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(getOAuthErrorMessage(err, provider));
      setIsLoading(null);
    }
  };

  const btnBase = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "1rem",
    borderRadius: "0.75rem",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: isLoading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    opacity: isLoading ? 0.7 : 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.75rem", padding: "1rem" }}>
          <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        onClick={() => handleSocialAuth("google")}
        disabled={isLoading !== null || !supabase}
        style={{ ...btnBase, backgroundColor: "white", border: "1px solid #d1d5db", color: "#374151" }}
      >
        {isLoading === "google" ? (
          <span>Connecting to Google...</span>
        ) : (
          <>
            <svg style={{ width: "1.25rem", height: "1.25rem" }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <button
        onClick={() => handleSocialAuth("facebook")}
        disabled={isLoading !== null || !supabase}
        style={{ ...btnBase, backgroundColor: "#1877F2", border: "1px solid #1877F2", color: "white" }}
      >
        {isLoading === "facebook" ? (
          <span>Connecting to Facebook...</span>
        ) : (
          <>
            <svg style={{ width: "1.25rem", height: "1.25rem", fill: "currentColor" }} viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
          </>
        )}
      </button>

      <div style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.75rem" }}>
        <p style={{ fontSize: "0.875rem", color: "#0369a1", margin: 0, textAlign: "center" }}>
          💡 You can also sign in with email or phone
        </p>
      </div>
    </div>
  );
}

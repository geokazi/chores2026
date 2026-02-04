import { useEffect, useState } from "preact/hooks";
// Import createClient dynamically to avoid bundling issues
// import { createClient } from '@supabase/supabase-js';

// OAuth error handling utilities
function getOAuthErrorMessage(
  error: any,
  provider: "google" | "facebook",
): string {
  const technicalErrors = [
    "redirect_uri_mismatch",
    "client_id",
    "project_id",
    "invalid_client",
    "unauthorized_client",
    "invalid_grant",
  ];

  const errorString = (error?.message || error || "").toLowerCase();

  if (technicalErrors.some((tech) => errorString.includes(tech))) {
    return `${provider} authentication is being configured. Please try email or phone signup, or contact support if this continues.`;
  }

  if (
    errorString.includes("access_denied") || errorString.includes("cancelled")
  ) {
    return `${provider} authentication was cancelled. You can try again or use email/phone signup.`;
  }

  if (errorString.includes("network") || errorString.includes("timeout")) {
    return "Network connection issue. Please check your internet and try again.";
  }

  return `${provider} authentication is temporarily unavailable. Please try email or phone signup.`;
}

interface SocialAuthButtonsProps {
  redirectTo?: string;
  selectedPlan?: {
    planId: string;
    billingCycle: string;
    source: string;
  };
  isSignup?: boolean;
}

export default function SocialAuthButtons(
  { redirectTo, selectedPlan, isSignup }: SocialAuthButtonsProps,
) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client only on client-side
  useEffect(() => {
    async function initSupabase() {
      if (typeof window !== "undefined") {
        const supabaseUrl = (globalThis as any).SUPABASE_URL;
        const supabaseKey = (globalThis as any).SUPABASE_KEY;

        if (supabaseUrl && supabaseKey) {
          try {
            // Wait for global Supabase to be available (loaded via CDN script tag)
            let retries = 0;
            const maxRetries = 10;

            while (!(window as any).supabase && retries < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              retries++;
            }

            if (!(window as any).supabase) {
              throw new Error("Supabase library failed to load from CDN");
            }

            // Access globally loaded Supabase - bypasses Fresh bundling issues
            const { createClient } = (window as any).supabase;
            const client = createClient(supabaseUrl, supabaseKey);
            setSupabase(client);
            setError(null); // Clear any previous errors
          } catch (err) {
            console.error("Failed to load Supabase:", err);
            setError("Failed to load authentication system");
          }
        } else {
          setError("Authentication configuration missing");
        }
      }
    }

    initSupabase();
  }, []);

  // Clear error when component is ready and functional
  useEffect(() => {
    if (supabase && !isLoading) {
      setError(null);
    }
  }, [supabase, isLoading]);

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    if (!supabase) {
      setError("Authentication not ready. Please refresh and try again.");
      return;
    }

    setIsLoading(provider);
    setError(null);

    // CRITICAL: Pre-validate OAuth configuration to prevent Google error exposure
    try {
      const validationResponse = await fetch(
        `/api/auth/validate-oauth?provider=${provider}`,
      );
      const validation = await validationResponse.json();

      if (!validation.available) {
        setError(
          validation.userMessage ||
            `${provider} authentication is temporarily unavailable. Please use email or phone signup.`,
        );
        setIsLoading(null);
        return;
      }

      // Clear error if validation passes
      setError(null);
    } catch (validationError) {
      console.error(
        `OAuth pre-validation failed for ${provider}:`,
        validationError,
      );
      setError(
        `${provider} authentication is temporarily unavailable. Please use email or phone signup.`,
      );
      setIsLoading(null);
      return;
    }

    try {
      const origin = window.location.origin;
      // Redirect back to /login where the user initiated OAuth
      // The oauth-fragment-handler.js on /login will process the tokens
      const finalRedirectTo = redirectTo || `${origin}/login`;

      // CRITICAL: Force staging to use staging redirect instead of Supabase Site URL
      let actualRedirectTo = finalRedirectTo;
      if (origin.includes("stg") || origin.includes("staging")) {
        actualRedirectTo = `${origin}/login`;
        console.log(
          "🎯 Staging OAuth: Forcing redirect to staging callback:",
          actualRedirectTo,
        );
      }

      let options: any = {
        redirectTo: actualRedirectTo,
      };

      // Add signup metadata for new user registration
      if (isSignup && selectedPlan) {
        options.data = {
          product_context: "chores2026",
          signup_source: "social",
          signup_timestamp: new Date().toISOString(),
          selected_plan: {
            plan_id: selectedPlan.planId,
            billing_cycle: selectedPlan.billingCycle,
            selected_at: new Date().toISOString(),
            source: selectedPlan.source,
          },
        };
      }

      // Provider-specific configurations
      if (provider === "google") {
        options.queryParams = {
          access_type: "offline",
          prompt: "consent",
        };
        options.scopes = "email profile";
      } else if (provider === "facebook") {
        options.scopes = "public_profile email";
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);

        // Use production-safe error messaging
        const userFriendlyMessage = getOAuthErrorMessage(error, provider);
        setError(userFriendlyMessage);
        setIsLoading(null);
        return;
      }

      if (data.url) {
        // CRITICAL: Additional validation before redirect to prevent Google error exposure
        try {
          const oauthUrl = new URL(data.url);

          // Validate the OAuth URL structure
          if (
            !oauthUrl.hostname.includes("accounts.google.com") &&
            !oauthUrl.hostname.includes("facebook.com") &&
            !oauthUrl.hostname.includes("meta.com")
          ) {
            throw new Error("Invalid OAuth provider URL");
          }

          // Check for problematic OAuth configurations that would expose technical details
          // Note: Removed client ID block since redirect URIs are now properly configured

          // Facebook App ID validation removed - now using custom domain

          // Only redirect if we pass all validation checks
          window.location.href = data.url;
        } catch (urlError) {
          console.error("OAuth URL validation error:", urlError);
          setError(
            `${provider} authentication is temporarily unavailable. Please use email or phone signup.`,
          );
          setIsLoading(null);
        }
      } else {
        throw new Error(`No authorization URL returned for ${provider}`);
      }
    } catch (err) {
      console.error(`${provider} authentication error:`, err);

      // Use production-safe error messaging
      const userFriendlyMessage = getOAuthErrorMessage(err, provider);
      setError(userFriendlyMessage);
      setIsLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem",
          }}
        >
          <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Google Sign In */}
      <button
        onClick={() => handleSocialAuth("google")}
        disabled={isLoading !== null || !supabase}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1rem",
          backgroundColor: isLoading === "google" ? "#f3f4f6" : "white",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          fontSize: "1rem",
          fontWeight: "500",
          color: "#374151",
          cursor: isLoading !== null ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: isLoading !== null ? 0.7 : 1,
        }}
        onMouseOver={isLoading === null
          ? (e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
            e.currentTarget.style.borderColor = "#9ca3af";
          }
          : undefined}
        onMouseOut={isLoading === null
          ? (e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#d1d5db";
          }
          : undefined}
      >
        {isLoading === "google"
          ? (
            <>
              <div
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  border: "2px solid #e5e7eb",
                  borderTop: "2px solid #3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span>Connecting to Google...</span>
            </>
          )
          : (
            <>
              <svg
                style={{ width: "1.25rem", height: "1.25rem" }}
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
      </button>

      {/* Facebook Sign In */}
      <button
        onClick={() => handleSocialAuth("facebook")}
        disabled={isLoading !== null || !supabase}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1rem",
          backgroundColor: isLoading === "facebook" ? "#f3f4f6" : "#1877F2",
          border: "1px solid #1877F2",
          borderRadius: "0.75rem",
          fontSize: "1rem",
          fontWeight: "500",
          color: "white",
          cursor: isLoading !== null ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: isLoading !== null ? 0.7 : 1,
        }}
        onMouseOver={isLoading === null
          ? (e) => {
            e.currentTarget.style.backgroundColor = "#166FE5";
          }
          : undefined}
        onMouseOut={isLoading === null
          ? (e) => {
            e.currentTarget.style.backgroundColor = "#1877F2";
          }
          : undefined}
      >
        {isLoading === "facebook"
          ? (
            <>
              <div
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  border: "2px solid #94a3b8",
                  borderTop: "2px solid #white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span>Connecting to Facebook...</span>
            </>
          )
          : (
            <>
              <svg
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  fill: "currentColor",
                }}
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook</span>
            </>
          )}
      </button>

      {/* Phone authentication note */}
      <div
        style={{
          marginTop: "1rem",
          padding: "1rem",
          backgroundColor: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>💡</span>
          <p style={{ fontSize: "0.875rem", color: "#0369a1", margin: 0 }}>
            You can also sign in with your phone number using the Phone tab
            above.
          </p>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

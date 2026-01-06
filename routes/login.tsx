/**
 * Login Route - Refactored for Composition and Maintainability
 *
 * Lightweight route handler that composes authentication services and
 * shared UI components. Reduced from 707 lines to ~180 lines (74% reduction)
 * by extracting duplicated logic to shared services.
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { AuthenticationService } from "../lib/auth/AuthenticationService.twilio-verify.ts";
import { UserDataManager } from "../lib/auth/UserDataManager.ts";
import { AuthErrorHandler } from "../lib/auth/AuthErrorHandler.ts";
import AuthPageLayout from "../islands/auth/AuthPageLayout.tsx";
import AuthModeSelector from "../islands/auth/AuthModeSelector.tsx";
import EmailAuthForm from "../islands/auth/EmailAuthForm.tsx";
import PhoneAuthForm from "../islands/auth/PhoneAuthForm.tsx";
import SocialAuthButtons from "../islands/SocialAuthButtons.tsx";
import { getVersionedUrl } from "../utils/version.ts";

interface LoginPageData {
  error?: string;
  mode?: "email" | "phone" | "social";
  phone?: string;
  email?: string;
  rateLimited?: boolean;
  otpSent?: boolean;
}

export const handler: Handlers<LoginPageData> = {
  async POST(req) {
    // 1. Parse and validate request data
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const otp = formData.get("otp") as string;
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "email";

    // 2. Delegate to authentication service
    const authService = new AuthenticationService(req);
    let result;

    try {
      if (mode === "phone") {
        if (phone && !otp) {
          // Send OTP
          result = await authService.sendPhoneOTP(phone, { flow: "login" });

          if (result.success) {
            return new Response(null, {
              status: 303,
              headers: {
                Location: `/login?mode=phone&otp_sent=true`,
              },
            });
          }
        } else if (phone && otp) {
          // Verify OTP
          result = await authService.verifyPhoneOTP(phone, otp, {
            flow: "login",
          });
        }
      } else if (mode === "email" && email && password) {
        // Email authentication
        result = await authService.authenticateWithEmail(email, password);
      }

      // 3. Handle success case (session may be undefined for phone auth)
      if (result?.success && result.user) {
        console.log(
          "✅ LOGIN: Authentication successful, entering success path",
        );
        console.log("✅ LOGIN: User data:", {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          hasSession: !!result.session,
        });

        // Create and store user data
        const userData = UserDataManager.createUserData(result.user, "login");

        // Enhanced session response with localStorage integration
        console.log("🔧 LOGIN: Creating user session for successful auth");
        const sessionResult = await authService.createUserSession(
          result.user,
          "login",
          result.session,
        );

        console.log("🔧 LOGIN: Session result:", {
          success: sessionResult.success,
          status: sessionResult.response?.status,
          userData: sessionResult.userData,
        });

        if (!sessionResult.success) {
          console.error(
            "🚫 LOGIN: Session creation failed despite successful auth",
          );
          // Fall back to error handling
          return new Response(null, {
            status: 303,
            headers: { Location: "/login?error=session-failed" },
          });
        }

        // Use the session response directly with localStorage enhancement
        const sessionHtml = await sessionResult.response.text();

        // Enhance the session response with localStorage integration
        // Add localStorage code before existing script instead of replacing it
        const enhancedHtml = sessionHtml.replace(
          "<script>",
          `<script>
              // Store user data for client-side access
              localStorage.setItem('chores2026_user_data', JSON.stringify(${
            JSON.stringify(userData)
          }));
              console.log('📋 Login: Stored user data in localStorage');
              
              // Dispatch update event for navigation component
              window.dispatchEvent(new CustomEvent('chores2026_user_data_updated'));
            </script>
            <script>`,
        );

        const enhancedResponse = new Response(enhancedHtml, {
          status: sessionResult.response.status,
          headers: sessionResult.response.headers,
        });

        return enhancedResponse;
      }

      // 4. Handle authentication failure
      if (result && !result.success) {
        console.log("🚫 LOGIN: Authentication failed, entering error path");
        console.log("🚫 LOGIN: Error details:", {
          success: result.success,
          errorType: result.error?.type,
          errorMessage: result.error?.message,
        });

        const error = AuthErrorHandler.formatAuthError(result, {
          flow: "login",
          mode: mode as any,
          additionalParams: {
            // ✅ SECURE: Only non-sensitive context data
            mode: mode,
            // ❌ REMOVED: phone, email, password - never include in redirects
          },
        });
        return AuthErrorHandler.createErrorRedirect(
          error,
          "/login",
          { flow: "login", mode: mode as "email" | "phone" | "social" },
          [
            "mode",
            // ❌ REMOVED: "phone", "email" - never preserve sensitive data in URLs
          ],
        );
      }

      // 5. Invalid request fallback
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/login?error=invalid-request&mode=${mode}`,
        },
      });
    } catch (error) {
      console.error("Login route error:", error);
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/login?error=technical-error&mode=${mode}`,
        },
      });
    }
  },

  async GET(req, ctx) {
    // Simple page data preparation
    const url = new URL(req.url);
    const error = url.searchParams.get("error");
    const mode = url.searchParams.get("mode") || "email";
    const phone = url.searchParams.get("phone") || ""; // Keep minimal URL support as fallback
    const email = url.searchParams.get("email");
    const otpSent = url.searchParams.get("otp_sent") === "true";
    const resend = url.searchParams.get("resend") === "true";

    // Map URL error codes to user-friendly messages
    let errorMessage = "";
    if (error) {
      // Use context-aware error formatting for consistent phone/email messaging
      const mockAuthResult = {
        success: false,
        error: {
          type: error.replace(/-/g, "_"), // Convert URL format back to internal format
          message: "Error occurred",
        },
      };

      const formattedError = AuthErrorHandler.formatAuthError(
        mockAuthResult as any,
        {
          flow: "login",
          mode: mode as any,
        },
      );

      errorMessage = formattedError.userMessage;
    }

    return ctx.render({
      error: errorMessage,
      mode: mode as "email" | "phone" | "social",
      phone: phone, // Minimal fallback - sessionStorage is primary
      email: email || "",
      rateLimited: error === "rate-limit",
      otpSent,
    });
  },
};

export default function LoginPage({ data }: PageProps<LoginPageData>) {
  const { mode = "email", error, phone, email, rateLimited, otpSent } = data;

  console.log("LoginPage rendering with mode:", mode, "data:", data);

  return (
    <>
      {/* Include OAuth fragment handlers for social login */}
      <script src={getVersionedUrl("/oauth-fragment-handler.js")} defer>
      </script>
      {/* Supabase CDN for social authentication - bypasses Fresh bundling issues */}
      <script
        src="https://unpkg.com/@supabase/supabase-js@2.79.0/dist/umd/supabase.js"
        defer
      >
      </script>
      {/* Note: auth-cookie-sync.js is already loaded in _app.tsx */}

      <AuthPageLayout
        title="Welcome Back"
        subtitle="Sign in to your Chores2026 account"
        variant="login"
        showTrustIndicators={true}
      >
        {/* Mode Selection */}
        <AuthModeSelector
          currentMode={mode}
          variant="login"
          disabled={rateLimited}
        />

        {/* Email Authentication Form */}
        {mode === "email" && (
          <EmailAuthForm
            variant="login"
            error={error}
            email={email}
            disabled={rateLimited}
          />
        )}

        {/* Phone Authentication Form */}
        {mode === "phone" && (
          <PhoneAuthForm
            variant="login"
            error={error}
            phone={phone}
            otpSent={otpSent}
            disabled={rateLimited}
          />
        )}

        {/* Social Authentication */}
        {mode === "social" && (
          <div style={{ marginBottom: "1.5rem" }}>
            <SocialAuthButtons />
          </div>
        )}
      </AuthPageLayout>
    </>
  );
}

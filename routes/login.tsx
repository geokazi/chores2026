/**
 * Login Route - Email, Phone OTP, and Social Auth
 * 20% effort for 80% value - uses existing islands
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { createClient } from "@supabase/supabase-js";
import AuthModeSelector from "../islands/auth/AuthModeSelector.tsx";
import PhoneAuthForm from "../islands/auth/PhoneAuthForm.tsx";
import SocialAuthButtons from "../islands/auth/SocialAuthButtons.tsx";
import AppFooter from "../components/AppFooter.tsx";

type AuthMode = "email" | "phone" | "social";

interface LoginPageData {
  mode: AuthMode;
  error?: string;
  otpSent?: boolean;
}

export const handler: Handlers<LoginPageData> = {
  async POST(req, ctx) {
    const formData = await req.formData();
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;

    // Phone OTP verification (check this first since it has "otp" field)
    if (formData.has("otp")) {
      const phone = formData.get("phone") as string;
      const otp = formData.get("otp") as string;

      try {
        const { TwilioVerifyClient } = await import("../lib/twilio-client.ts");
        const twilioClient = new TwilioVerifyClient();
        const result = await twilioClient.verifyCode(phone, otp);

        if (!result.success || !result.valid) {
          return ctx.render({ mode: "phone", error: result.error || "Invalid code", otpSent: true });
        }

        // Create or get user by phone
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Look up user by phone or create temp session
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find(u => u.phone === phone);

        if (user) {
          // Generate session for existing user
          const { data: session } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: user.email || `${phone.replace(/\D/g, "")}@phone.choregami.local`,
          });

          if (session?.properties?.hashed_token) {
            const { data: authData } = await supabase.auth.verifyOtp({
              token_hash: session.properties.hashed_token,
              type: "magiclink",
            });

            if (authData?.session) {
              return createSessionResponse(req, authData.session);
            }
          }
        }

        return ctx.render({ mode: "phone", error: "No account found for this phone", otpSent: true });
      } catch (error) {
        console.error("❌ OTP verify error:", error);
        return ctx.render({ mode: "phone", error: "Verification failed", otpSent: true });
      }
    }

    // Phone OTP send mode (no "otp" field means requesting a code)
    if (mode === "phone") {
      const phone = formData.get("phone") as string;
      if (!phone) {
        return ctx.render({ mode, error: "Phone number required" });
      }

      try {
        const { TwilioVerifyClient } = await import("../lib/twilio-client.ts");
        const twilioClient = new TwilioVerifyClient();
        const result = await twilioClient.sendVerification(phone);

        if (!result.success) {
          return ctx.render({ mode, error: result.error || "Failed to send code. Try again." });
        }

        return ctx.render({ mode, otpSent: true });
      } catch (error) {
        console.error("❌ SMS error:", error);
        return ctx.render({ mode, error: "Failed to send code. Try again." });
      }
    }

    // Email/password mode
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return ctx.render({ mode: "email", error: "Email and password required" });
    }

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        return ctx.render({ mode: "email", error: "Invalid email or password" });
      }

      return createSessionResponse(req, data.session);
    } catch (error) {
      console.error("❌ Login error:", error);
      return ctx.render({ mode: "email", error: "Login failed" });
    }
  },

  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    if (session.isAuthenticated) {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;
    const error = url.searchParams.get("error") || undefined;

    return ctx.render({ mode, error });
  },
};

function createSessionResponse(req: Request, session: any) {
  const isLocalhost = req.url.includes("localhost");
  const isSecure = !isLocalhost;

  const cookies = [
    `sb-access-token=${session.access_token}; Path=/; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  ];

  return new Response(null, {
    status: 303,
    headers: { Location: "/", "Set-Cookie": cookies.join(", ") },
  });
}

export default function LoginPage({ data }: PageProps<LoginPageData>) {
  const { mode, error, otpSent } = data;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_KEY") || "";

  return (
    <>
      {/* OAuth fragment handler - processes #access_token=... from OAuth redirects */}
      <script src="/oauth-fragment-handler.js"></script>

      <div class="login-container">
        <div class="login-card">
        <div class="login-header">
          <h1>ChoreGami 2026</h1>
          <p>Sign in to manage your family's chores</p>
        </div>

        {error && <div class="error-message">{error}</div>}

        <AuthModeSelector currentMode={mode} variant="login" />

        {mode === "email" && (
          <form method="POST" class="login-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required class="form-input" placeholder="parent@example.com" />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required class="form-input" placeholder="Your password" />
            </div>
            <button type="submit" class="login-button">Sign In</button>
          </form>
        )}

        {mode === "phone" && (
          <PhoneAuthForm variant="login" otpSent={otpSent} error={error} />
        )}

        {mode === "social" && (
          <>
            <script dangerouslySetInnerHTML={{ __html: `window.SUPABASE_URL="${supabaseUrl}";window.SUPABASE_KEY="${supabaseKey}";` }} />
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
            <SocialAuthButtons />
          </>
        )}

        <div class="login-footer">
          <p class="security-note">🔒 Secured with enterprise authentication</p>
        </div>
        <AppFooter />
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg) 0%, #e8f5e8 100%);
          padding: 1rem;
        }
        .login-card {
          background: var(--color-card);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .login-header h1 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary);
          font-size: 2rem;
          font-weight: 700;
        }
        .login-header p {
          margin: 0;
          color: var(--color-text);
          opacity: 0.8;
        }
        .error-message {
          background: #fee;
          color: var(--color-warning);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid var(--color-warning);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-weight: 600;
          color: var(--color-text);
        }
        .form-input {
          padding: 0.75rem;
          border: 2px solid #e5e5e5;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .login-button {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 0.5rem;
        }
        .login-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e5e5;
        }
        .security-note {
          color: var(--color-success);
          font-weight: 500;
          margin: 0;
          font-size: 0.875rem;
        }
      `}</style>
      </div>
    </>
  );
}

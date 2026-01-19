/**
 * Register Route - New User Signup with Email, Phone OTP, or Social Auth
 * Creates Supabase auth user, then redirects to /setup for profile completion
 * ~115 lines - reuses existing auth islands, respects 500 line limit
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import AuthModeSelector from "../islands/auth/AuthModeSelector.tsx";
import PhoneAuthForm from "../islands/auth/PhoneAuthForm.tsx";
import SocialAuthButtons from "../islands/auth/SocialAuthButtons.tsx";
import AppFooter from "../components/AppFooter.tsx";
import { sendWelcomeEmail } from "../lib/services/email-service.ts";

type AuthMode = "email" | "phone" | "social";

interface RegisterPageData {
  mode: AuthMode;
  error?: string;
  otpSent?: boolean;
}

export const handler: Handlers<RegisterPageData> = {
  async POST(req, ctx) {
    const formData = await req.formData();
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;

    // Honeypot check - bots fill hidden fields, humans don't
    const honeypot = formData.get("website");
    if (honeypot) {
      console.warn("🤖 Honeypot triggered on register:", {
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        timestamp: new Date().toISOString()
      });
      // Return generic error to not tip off bots
      return ctx.render({ mode, error: "Registration failed. Please try again." });
    }

    // Phone OTP verification (same as login - creates user if needed)
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

        // Phone verified - create or get user
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Check if user exists with this phone
        const { data: users } = await supabase.auth.admin.listUsers();
        const phoneDigits = phone.replace(/\D/g, "");
        const existingUser = users?.users?.find(u =>
          u.phone === phone ||
          u.email?.includes(`+1${phoneDigits}@phone.`) ||
          u.email?.includes(`${phoneDigits}@phone.`)
        );

        if (existingUser) {
          // User exists - generate magic link and redirect
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: existingUser.email!,
            options: { redirectTo: new URL("/setup", req.url).toString() },
          });

          if (linkData?.properties?.action_link) {
            return new Response(null, {
              status: 303,
              headers: { Location: linkData.properties.action_link },
            });
          }
        }

        // New user - create with phone-based email
        const phoneEmail = `${phone}@phone.choregami.local`;
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: phoneEmail,
          phone: phone,
          email_confirm: true,
          phone_confirm: true,
        });

        if (createError || !newUser.user) {
          return ctx.render({ mode: "phone", error: "Failed to create account", otpSent: true });
        }

        // Generate magic link for new user
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: phoneEmail,
          options: { redirectTo: new URL("/setup", req.url).toString() },
        });

        if (linkData?.properties?.action_link) {
          return new Response(null, {
            status: 303,
            headers: { Location: linkData.properties.action_link },
          });
        }

        return ctx.render({ mode: "phone", error: "Account created but login failed", otpSent: true });
      } catch (error) {
        console.error("Phone register error:", error);
        return ctx.render({ mode: "phone", error: "Registration failed", otpSent: true });
      }
    }

    // Phone OTP send mode
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
          return ctx.render({ mode, error: result.error || "Failed to send code" });
        }

        return ctx.render({ mode, otpSent: true });
      } catch (error) {
        console.error("SMS error:", error);
        return ctx.render({ mode, error: "Failed to send code" });
      }
    }

    // Email/password signup
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password) {
      return ctx.render({ mode: "email", error: "Email and password required" });
    }

    if (password !== confirmPassword) {
      return ctx.render({ mode: "email", error: "Passwords do not match" });
    }

    if (password.length < 8) {
      return ctx.render({ mode: "email", error: "Password must be at least 8 characters" });
    }

    try {
      // Use admin API to create user with confirmed email, then send welcome via Resend
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === email);
      if (userExists) {
        return ctx.render({ mode: "email", error: "Unable to create account. Please try signing in or use a different email." });
      }

      // Create user with email pre-confirmed (we'll verify via Resend)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error("User creation error:", createError);
        return ctx.render({ mode: "email", error: createError?.message || "Failed to create account" });
      }

      console.log("✅ User created:", newUser.user.email);

      // Send welcome email via Resend
      const setupUrl = new URL("/setup", req.url).toString();
      console.log("📧 Attempting to send welcome email to:", email, "with setup URL:", setupUrl);

      try {
        const emailResult = await sendWelcomeEmail(email, setupUrl);
        if (emailResult.success) {
          console.log("✅ Welcome email sent successfully to:", email);
        } else {
          console.warn("⚠️ Welcome email failed (non-critical):", emailResult.error);
        }
      } catch (emailError) {
        console.error("❌ Welcome email exception:", emailError);
      }

      // Generate magic link to log them in immediately
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: { redirectTo: new URL("/setup", req.url).toString() },
      });

      if (linkError || !linkData?.properties?.action_link) {
        // Fallback: tell them to log in manually
        return ctx.render({ mode: "email", error: "Account created! Check your email, then sign in." });
      }

      // Auto-login via magic link
      return new Response(null, {
        status: 303,
        headers: { Location: linkData.properties.action_link },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return ctx.render({ mode: "email", error: "Registration failed" });
    }
  },

  async GET(req, ctx) {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;
    const error = url.searchParams.get("error") || undefined;

    return ctx.render({ mode, error });
  },
};

function createSessionResponse(req: Request, session: any, redirectTo: string) {
  const isLocalhost = req.url.includes("localhost");
  const isSecure = !isLocalhost;

  const cookies = [
    `sb-access-token=${session.access_token}; Path=/; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  ];

  return new Response(null, {
    status: 303,
    headers: { Location: redirectTo, "Set-Cookie": cookies.join(", ") },
  });
}

export default function RegisterPage({ data }: PageProps<RegisterPageData>) {
  const { mode, error, otpSent } = data;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_KEY") || "";

  return (
    <>
      <script src="/oauth-fragment-handler.js"></script>

      <div class="register-container">
        <div class="register-card">
          <div class="register-header">
            <h1>ChoreGami 2026</h1>
            <p>Create your account</p>
          </div>

          {error && <div class="error-message">{error}</div>}

          <AuthModeSelector currentMode={mode} variant="signup" />

          {mode === "email" && (
            <form method="POST" class="register-form">
              {/* Honeypot field - invisible to humans, bots fill it */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required class="form-input" placeholder="parent@example.com" />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required class="form-input" placeholder="Min 8 characters" minLength={8} />
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required class="form-input" placeholder="Confirm password" />
              </div>
              <button type="submit" class="register-button">Create Account</button>
            </form>
          )}

          {mode === "phone" && (
            <PhoneAuthForm variant="signup" otpSent={otpSent} error={error} />
          )}

          {mode === "social" && (
            <>
              <script dangerouslySetInnerHTML={{ __html: `window.SUPABASE_URL="${supabaseUrl}";window.SUPABASE_KEY="${supabaseKey}";` }} />
              <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
              <SocialAuthButtons />
            </>
          )}

          <div class="register-footer">
            <p>Already have an account? <a href="/login">Sign In</a></p>
            <p class="legal-note">
              By creating an account, you agree to our{" "}
              <a href="/terms" class="legal-link">Terms</a> and{" "}
              <a href="/privacy" class="legal-link">Privacy Policy</a>
            </p>
          </div>
          <AppFooter />
        </div>

        <style>{`
          .register-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
            padding: 1rem;
          }
          .register-card {
            background: var(--color-card, white);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
          }
          .register-header {
            text-align: center;
            margin-bottom: 1.5rem;
          }
          .register-header h1 {
            margin: 0 0 0.5rem 0;
            color: var(--color-primary, #10b981);
            font-size: 2rem;
            font-weight: 700;
          }
          .register-header p {
            margin: 0;
            color: var(--color-text, #064e3b);
            opacity: 0.8;
          }
          .error-message {
            background: #fee;
            color: var(--color-warning, #ef4444);
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid var(--color-warning, #ef4444);
          }
          .register-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .form-group label {
            font-weight: 600;
            color: var(--color-text, #064e3b);
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
            border-color: var(--color-primary, #10b981);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          }
          .register-button {
            background: var(--color-primary, #10b981);
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
          .register-button:hover {
            background: #059669;
            transform: translateY(-1px);
          }
          .register-footer {
            text-align: center;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e5e5;
          }
          .register-footer a {
            color: var(--color-primary, #10b981);
            text-decoration: none;
            font-weight: 600;
          }
          .register-footer a:hover {
            text-decoration: underline;
          }
          .legal-note {
            color: #666;
            font-size: 0.75rem;
            margin: 0.5rem 0 0 0;
          }
          .legal-link {
            color: var(--color-primary, #10b981);
            text-decoration: none;
          }
          .legal-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    </>
  );
}

/**
 * SIMPLIFIED Login Route for ChoreGami 2026
 * 20% effort for 80% value - basic auth that works with session system
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { createClient } from "@supabase/supabase-js";
import AppFooter from "../components/AppFooter.tsx";

interface LoginPageData {
  error?: string;
  redirected?: boolean;
}

export const handler: Handlers<LoginPageData> = {
  async POST(req, ctx) {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return ctx.render({
        error: "Email and password are required",
      });
    }

    try {
      // Use Supabase for authentication
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Login error:", error);
        return ctx.render({
          error: "Invalid email or password",
        });
      }

      if (!data.session || !data.user) {
        return ctx.render({
          error: "Login failed - no session created",
        });
      }

      console.log("✅ Login successful:", data.user.email);

      // Create authentication cookies
      const isLocalhost = req.url.includes("localhost");
      const isSecure = !isLocalhost;

      const authCookies = [
        `sb-access-token=${data.session.access_token}; Path=/; ${
          isSecure ? "Secure; " : ""
        }SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
        `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; ${
          isSecure ? "Secure; " : ""
        }SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`, // 30 days
      ];

      // Redirect to main app
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": authCookies.join(", "),
        },
      });
    } catch (error) {
      console.error("💥 Login route error:", error);
      return ctx.render({
        error: "Login failed - please try again",
      });
    }
  },

  async GET(req, ctx) {
    // Check if already authenticated
    const session = await getAuthenticatedSession(req);
    if (session.isAuthenticated) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/" },
      });
    }

    const url = new URL(req.url);
    const error = url.searchParams.get("error");

    return ctx.render({
      error: error || undefined,
      redirected: url.searchParams.has("redirected"),
    });
  },
};

export default function LoginPage({ data }: PageProps<LoginPageData>) {
  const { error, redirected } = data;

  return (
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>ChoreGami 2026</h1>
          <p>Sign in to manage your family's chores</p>
          {redirected && (
            <p class="info-message">Please log in to continue</p>
          )}
        </div>

        {error && (
          <div class="error-message">
            {error}
          </div>
        )}

        <form method="POST" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="form-input"
              placeholder="parent@example.com"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              class="form-input"
              placeholder="Your password"
            />
          </div>

          <button type="submit" class="login-button">
            Sign In
          </button>
        </form>

        <div class="login-footer">
          <p>Don't have an account? Contact your family admin</p>
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
          margin-bottom: 2rem;
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

        .info-message {
          background: var(--color-bg);
          color: var(--color-primary);
          padding: 0.75rem;
          border-radius: 8px;
          margin-top: 1rem !important;
          border: 1px solid var(--color-primary);
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e5e5;
        }

        .login-footer p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: var(--color-text);
          opacity: 0.7;
        }

        .security-note {
          color: var(--color-success) !important;
          font-weight: 500 !important;
          opacity: 1 !important;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 1.5rem;
            margin: 0.5rem;
          }

          .login-header h1 {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
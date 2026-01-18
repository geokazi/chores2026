/**
 * Setup Route - Profile Completion for Authenticated Users
 * Shows form to create family + parent profile after OAuth/email signup
 * ~95 lines - respects 500 line limit
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { createClient } from "@supabase/supabase-js";
import AppFooter from "../components/AppFooter.tsx";

interface SetupPageData {
  error?: string;
  email?: string;
}

export const handler: Handlers<SetupPageData> = {
  async GET(req, ctx) {
    const cookies = getCookies(req.headers);
    const accessToken = cookies["sb-access-token"];

    // Not authenticated -> redirect to login
    if (!accessToken) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser(accessToken);

    // Invalid token -> redirect to login
    if (!user) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    // Already has profile -> redirect to home
    const { data: existingProfile } = await supabase
      .from("family_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single();

    if (existingProfile) {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    const url = new URL(req.url);
    const error = url.searchParams.get("error") || undefined;

    return ctx.render({ email: user.email, error });
  },

  async POST(req, ctx) {
    const formData = await req.formData();
    const parentName = formData.get("parentName") as string;
    const familyName = formData.get("familyName") as string;

    if (!parentName?.trim() || !familyName?.trim()) {
      return ctx.render({ error: "Both fields are required" });
    }

    // Forward cookies to API call
    const cookies = req.headers.get("cookie") || "";

    const response = await fetch(new URL("/api/family/create", req.url).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookies,
      },
      body: JSON.stringify({ parentName, familyName }),
    });

    const result = await response.json();

    if (!result.success) {
      return ctx.render({ error: result.error || "Failed to create family" });
    }

    // Success -> redirect to home
    return new Response(null, { status: 303, headers: { Location: "/" } });
  },
};

export default function SetupPage({ data }: PageProps<SetupPageData>) {
  const { error, email } = data;

  return (
    <div class="setup-container">
      <div class="setup-card">
        <div class="setup-header">
          <h1>ChoreGami 2026</h1>
          <p>Complete Your Profile</p>
        </div>

        <div class="welcome-message">
          Welcome! Let's set up your family.
          {email && <span class="email-hint">({email})</span>}
        </div>

        {error && <div class="error-message">{error}</div>}

        <form method="POST" class="setup-form">
          <div class="form-group">
            <label for="parentName">Your Name</label>
            <input
              type="text"
              id="parentName"
              name="parentName"
              required
              class="form-input"
              placeholder="e.g., Mom, Dad, George"
              autoFocus
            />
          </div>

          <div class="form-group">
            <label for="familyName">Family Name</label>
            <input
              type="text"
              id="familyName"
              name="familyName"
              required
              class="form-input"
              placeholder="e.g., The Smiths, Smith Family"
            />
          </div>

          <button type="submit" class="setup-button">Get Started</button>
        </form>

        <div class="setup-footer">
          <p class="help-note">You can add kids later in Settings</p>
        </div>

        <AppFooter />
      </div>

      <style>{`
        .setup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
          padding: 1rem;
        }
        .setup-card {
          background: var(--color-card, white);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
        .setup-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .setup-header h1 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary, #10b981);
          font-size: 2rem;
          font-weight: 700;
        }
        .setup-header p {
          margin: 0;
          color: var(--color-text, #064e3b);
          opacity: 0.8;
        }
        .welcome-message {
          text-align: center;
          padding: 1rem;
          background: #f0fdf4;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          color: #064e3b;
        }
        .email-hint {
          display: block;
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.25rem;
        }
        .error-message {
          background: #fee;
          color: var(--color-warning, #ef4444);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid var(--color-warning, #ef4444);
        }
        .setup-form {
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
        .setup-button {
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
        .setup-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .setup-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e5e5;
        }
        .help-note {
          color: #666;
          font-size: 0.875rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

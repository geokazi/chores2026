/**
 * Setup Route - Profile Completion for Authenticated Users
 * Shows form to create family + parent profile after OAuth/email signup
 * ~95 lines - respects 500 line limit
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../lib/supabase.ts";
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

    const supabase = getServiceSupabaseClient();

    const { data, error: getUserError } = await supabase.auth.getUser(accessToken);
    const user = data?.user;

    if (getUserError) {
      console.log("⚠️ Setup getUser error (rendering form anyway):", getUserError.message);
    }

    if (user) {
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
    }

    // Render setup form even if getUser failed — the POST handler validates the token.
    // This prevents infinite redirect loops when OAuth tokens are fresh but
    // getUser hasn't propagated yet.
    const url = new URL(req.url);
    const error = url.searchParams.get("error") || undefined;

    return ctx.render({ email: user?.email, error });
  },

  async POST(req, ctx) {
    try {
      const formData = await req.formData();
      const parentName = formData.get("parentName") as string;
      const familyName = formData.get("familyName") as string;

      if (!parentName?.trim() || !familyName?.trim()) {
        return ctx.render({ error: "Both fields are required" });
      }

      // Get auth token from cookies
      const cookies = getCookies(req.headers);
      const accessToken = cookies["sb-access-token"];

      if (!accessToken) {
        return new Response(null, { status: 303, headers: { Location: "/login" } });
      }

      const supabase = getServiceSupabaseClient();

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        console.error("Setup auth error:", authError);
        return new Response(null, { status: 303, headers: { Location: "/login" } });
      }

      // Check for existing profile
      const { data: existingProfile } = await supabase
        .from("family_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .single();

      if (existingProfile) {
        return new Response(null, { status: 303, headers: { Location: "/" } });
      }

      // Create family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({ name: familyName.trim(), settings: { _version: 1 } })
        .select("id")
        .single();

      if (familyError || !family) {
        console.error("Failed to create family:", familyError);
        return ctx.render({ error: `Failed to create family: ${familyError?.message || 'unknown'}` });
      }

      // Create parent profile
      const { error: profileError } = await supabase
        .from("family_profiles")
        .insert({
          family_id: family.id,
          user_id: user.id,
          name: parentName.trim(),
          role: "parent",
          current_points: 0,
          is_deleted: false,
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        await supabase.from("families").delete().eq("id", family.id);
        return ctx.render({ error: `Failed to create profile: ${profileError.message}` });
      }

      // Create kid profiles (optional)
      const kidNames = formData.getAll("kidName") as string[];
      const kidProfileIds: string[] = [];
      const kidErrors: string[] = [];
      for (const name of kidNames) {
        if (name.trim()) {
          const { data: kidProfile, error: kidError } = await supabase
            .from("family_profiles")
            .insert({
              family_id: family.id,
              name: name.trim(),
              role: "child",
              current_points: 0,
              is_deleted: false,
            })
            .select("id")
            .single();

          if (kidError) {
            console.error(`Failed to create kid "${name.trim()}":`, kidError.message);
            kidErrors.push(name.trim());
          } else if (kidProfile) {
            kidProfileIds.push(kidProfile.id);
          }
        }
      }

      // If any kids failed, redirect with warning (family + parent still created)
      if (kidErrors.length > 0 && kidProfileIds.length === 0) {
        const notice = encodeURIComponent(`Couldn't add ${kidErrors.join(", ")}. Add them in Settings.`);
        return new Response(null, { status: 303, headers: { Location: `/?notice=${notice}` } });
      }

      // Activate template if selected (and kids exist)
      let template = formData.get("template") as string;
      if (template && template !== "skip" && kidProfileIds.length > 0) {
        // daily_basics requires exactly 2 kids — fall back to dynamic_daily
        if (template === "daily_basics" && kidProfileIds.length !== 2) {
          template = "dynamic_daily";
        }

        const childSlots = kidProfileIds.map((id, i) => ({
          slot: `Child ${String.fromCharCode(65 + i)}`, // "Child A", "Child B"
          profile_id: id,
        }));

        const rotationConfig = {
          active_preset: template,
          child_slots: childSlots,
          start_date: new Date().toISOString().split("T")[0],
        };

        await supabase
          .from("families")
          .update({
            settings: {
              _version: 1,
              apps: { choregami: { rotation: rotationConfig } },
            },
          })
          .eq("id", family.id);
      }

      console.log("✅ Family created:", {
        familyId: family.id, parentName, familyName, userId: user.id,
        kids: kidProfileIds.length, template: template || "skip",
      });

      // Success -> clear any stale invite token and redirect to home
      return new Response(
        `<!DOCTYPE html><html><head><title>Setup Complete</title></head>
        <body>
          <script>
            localStorage.removeItem('pendingInviteToken');
            window.location.href = '/';
          </script>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } catch (error) {
      console.error("Setup POST error:", error);
      return ctx.render({ error: "An unexpected error occurred. Please try again." });
    }
  },
};

export default function SetupPage({ data }: PageProps<SetupPageData>) {
  const { error, email } = data;

  return (
    <div class="setup-container">
      {/* Check for pending invite token from OAuth flow */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var token = localStorage.getItem('pendingInviteToken');
            if (token) {
              console.log('[setup] Found pending invite token, redirecting to /join');
              // Don't remove token yet - /join will clear it after successful acceptance
              window.location.href = '/join?token=' + token;
            }
          })();
        `
      }} />
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

          <div class="section-divider">
            <span>Kids (optional)</span>
          </div>

          <div class="form-group">
            <input
              type="text"
              name="kidName"
              class="form-input"
              placeholder="First kid's name"
            />
          </div>
          <div class="form-group">
            <input
              type="text"
              name="kidName"
              class="form-input"
              placeholder="Second kid's name"
            />
          </div>

          <div class="section-divider">
            <span>Chore Template (optional)</span>
          </div>

          <div class="template-options">
            <label class="template-option">
              <input type="radio" name="template" value="dynamic_daily" />
              <span class="template-label">🔄 Daily Routines</span>
              <span class="template-desc">Personal + rotating shared chores</span>
            </label>
            <label class="template-option">
              <input type="radio" name="template" value="daily_basics" />
              <span class="template-label">🌱 Daily Basics</span>
              <span class="template-desc">Simple morning + evening routine (2 kids)</span>
            </label>
            <label class="template-option">
              <input type="radio" name="template" value="skip" checked />
              <span class="template-label">⏭️ Skip for now</span>
              <span class="template-desc">Set up chores later in Settings</span>
            </label>
          </div>

          <button type="submit" class="setup-button">Get Started</button>
        </form>

        <div class="setup-footer">
          <p class="help-note">You can add more kids, change templates, or set a parent PIN in Settings</p>
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
        .section-divider {
          text-align: center;
          margin: 0.5rem 0;
          position: relative;
        }
        .section-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          border-top: 1px solid #e5e5e5;
        }
        .section-divider span {
          background: var(--color-card, white);
          padding: 0 0.75rem;
          position: relative;
          color: #666;
          font-size: 0.8rem;
        }
        .template-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .template-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          flex-wrap: wrap;
        }
        .template-option:has(input:checked) {
          border-color: var(--color-primary, #10b981);
          background: #f0fdf4;
        }
        .template-option input[type="radio"] {
          accent-color: var(--color-primary, #10b981);
        }
        .template-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--color-text, #064e3b);
        }
        .template-desc {
          font-size: 0.75rem;
          color: #666;
          width: 100%;
          padding-left: 1.5rem;
        }
      `}</style>
    </div>
  );
}

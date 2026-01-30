/**
 * Join Family Page
 *
 * Handles invite acceptance flow:
 * 1. Validate token from URL
 * 2. Show family info and inviter
 * 3. If logged in → accept invite → redirect home
 * 4. If not logged in → redirect to login with return URL
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { InviteService } from "../lib/services/invite-service.ts";

interface JoinPageData {
  error?: string;
  familyName?: string;
  alreadyMember?: boolean;
}

export const handler: Handlers<JoinPageData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return ctx.render({ error: "No invite token provided" });
    }

    const inviteService = new InviteService();
    const found = await inviteService.findByToken(token);

    if (!found) {
      return ctx.render({ error: "This invite link is invalid or has expired" });
    }

    const session = await getAuthenticatedSession(req);

    // If logged in, try to accept invite
    if (session.isAuthenticated && session.user) {
      // Check if already a member of this family
      if (session.family?.id === found.familyId) {
        return ctx.render({
          alreadyMember: true,
          familyName: found.familyName,
        });
      }

      // Check if user already has a family (can't join another)
      if (session.family) {
        return ctx.render({
          error: "You already belong to a family. You must leave your current family before joining another.",
        });
      }

      // Accept the invite
      const result = await inviteService.acceptInvite(token, session.user.id);
      if (result.success) {
        // Redirect to home - they're now part of the family
        return new Response(null, {
          status: 303,
          headers: { Location: "/?joined=true" },
        });
      } else {
        return ctx.render({ error: result.error || "Failed to join family" });
      }
    }

    // Not logged in - redirect to login with invite token (Option A: skip intermediate page)
    // Store token in localStorage via redirect page for OAuth flow resilience
    const loginUrl = `/login?invite_token=${encodeURIComponent(token)}`;
    return new Response(
      `<!DOCTYPE html><html><head><title>Joining family...</title></head>
      <body>
        <script>
          localStorage.setItem('pendingInviteToken', '${token}');
          window.location.href = '${loginUrl}';
        </script>
      </body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  },
};

export default function JoinPage({ data }: PageProps<JoinPageData>) {
  const { error, familyName, alreadyMember } = data;

  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Join Family - ChoreGami</title>
        <link rel="stylesheet" href="/styles.css" />
        <style>{`
          .join-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          }
          .join-card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
          }
          .join-emoji {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .join-title {
            color: #10b981;
            margin-bottom: 0.5rem;
          }
          .join-subtitle {
            color: #666;
            margin-bottom: 1.5rem;
          }
          .join-family-name {
            font-size: 1.5rem;
            font-weight: 600;
            color: #064e3b;
            margin: 1rem 0;
          }
          .join-btn {
            display: block;
            width: 100%;
            padding: 1rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            margin-bottom: 0.75rem;
          }
          .join-btn-primary {
            background: #10b981;
            color: white;
          }
          .join-btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }
          .join-error {
            background: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }
          .join-success {
            background: #f0fdf4;
            color: #10b981;
            padding: 1rem;
            border-radius: 8px;
          }
        `}</style>
      </head>
      <body>
        <div class="join-container">
          <div class="join-card">
            {error ? (
              <>
                <div class="join-emoji">😕</div>
                <h1 class="join-title">Oops!</h1>
                <div class="join-error">{error}</div>

                {/* Token paste recovery option */}
                <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
                  <button
                    type="button"
                    id="token-toggle"
                    onClick="toggleTokenInput()"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    📋 Have an invite code?
                  </button>
                  <div id="token-paste-section" style={{ display: "none", marginTop: "1rem" }}>
                    <input
                      type="text"
                      id="token-input"
                      placeholder="Paste invite code from email..."
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "2px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontFamily: "monospace",
                        marginBottom: "0.5rem",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick="applyToken()"
                      class="join-btn join-btn-primary"
                      style={{ marginTop: "0.5rem" }}
                    >
                      Apply Code
                    </button>
                  </div>
                </div>
                <script dangerouslySetInnerHTML={{
                  __html: `
                    function toggleTokenInput() {
                      var section = document.getElementById('token-paste-section');
                      var toggle = document.getElementById('token-toggle');
                      if (section.style.display === 'none') {
                        section.style.display = 'block';
                        toggle.textContent = '▼ Hide invite code input';
                      } else {
                        section.style.display = 'none';
                        toggle.textContent = '📋 Have an invite code?';
                      }
                    }
                    function applyToken() {
                      var input = document.getElementById('token-input');
                      var token = input.value.trim();
                      if (token && token.length >= 20) {
                        localStorage.setItem('pendingInviteToken', token);
                        window.location.href = '/join?token=' + encodeURIComponent(token);
                      } else {
                        alert('Please enter a valid invite code (at least 20 characters)');
                      }
                    }
                  `
                }} />
              </>
            ) : alreadyMember ? (
              <>
                <div class="join-emoji">👋</div>
                <h1 class="join-title">You're Already Here!</h1>
                <p class="join-subtitle">You're already a member of</p>
                <div class="join-family-name">{familyName}</div>
                <a href="/" class="join-btn join-btn-primary">Go to Dashboard</a>
              </>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}

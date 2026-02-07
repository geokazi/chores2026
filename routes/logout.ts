/**
 * Logout Route - Clear all session data and redirect to login
 * Pattern: GET shows page that auto-submits to POST for proper logout
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

export const handler: Handlers = {
  async POST(req) {
    console.log("🚪 Logout POST - performing logout");

    // Try to invalidate session with Supabase
    try {
      const cookies = req.headers.get("cookie") || "";
      const accessToken = cookies.match(/sb-access-token=([^;]+)/)?.[1];

      if (accessToken) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_KEY")!,
          { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        );
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("⚠️ Supabase signOut error:", error);
        } else {
          console.log("✅ Supabase session invalidated");
        }
      }
    } catch (e) {
      console.error("⚠️ Could not invalidate Supabase session:", e);
    }

    // Clear ALL authentication cookies
    const isLocalhost = req.url.includes("localhost");
    const secure = isLocalhost ? "" : "Secure; ";

    const clearCookies = [
      `sb-access-token=; Path=/; ${secure}SameSite=Lax; Max-Age=0`,
      `sb-refresh-token=; Path=/; HttpOnly; ${secure}SameSite=Lax; Max-Age=0`,
      `active_kid_session=; Path=/; ${secure}SameSite=Lax; Max-Age=0`,
    ];

    console.log("✅ Cookies cleared, returning logout page");

    // Return HTML page that clears localStorage then redirects
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Logging out...</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 2rem; background: #f0fdf4; }
    .container { max-width: 400px; margin: 0 auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .spinner { border: 4px solid #e5e7eb; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 1rem auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .success { color: #10b981; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Logging out...</h2>
    <div class="spinner"></div>
    <p class="success">Clearing session data...</p>
  </div>
  <script>
    console.log('🔐 Logout: Clearing localStorage');
    try {
      localStorage.removeItem('chores2026_user_data');
      // Clear pending gift code and plan
      localStorage.removeItem('pendingGiftCode');
      localStorage.removeItem('pendingGiftPlan');
      localStorage.removeItem('pendingInviteToken');
      localStorage.removeItem('pendingPlanSelection');
      sessionStorage.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('chores2026_') || key.startsWith('sb-') || key.startsWith('choregami_')) {
          localStorage.removeItem(key);
          console.log('Cleared:', key);
        }
      });
    } catch(e) { console.error('Storage clear error:', e); }

    console.log('🔐 Logout: Redirecting to login');
    setTimeout(() => { window.location.href = '/login'; }, 500);
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Set-Cookie": clearCookies.join(", "),
      },
    });
  },

  async GET(req) {
    console.log("🚪 Logout GET - showing auto-submit page");

    // GET shows a page that immediately auto-submits to POST
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Logging out...</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 2rem; background: #f0fdf4; }
    .container { max-width: 400px; margin: 0 auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .spinner { border: 4px solid #e5e7eb; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 1rem auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h2>Logging out...</h2>
    <div class="spinner"></div>
    <form id="logoutForm" method="POST" action="/logout">
      <noscript><button type="submit">Click to logout</button></noscript>
    </form>
  </div>
  <script>
    console.log('🔐 Logout GET: Pre-clearing localStorage');
    try {
      localStorage.removeItem('chores2026_user_data');
      // Clear pending gift code and plan
      localStorage.removeItem('pendingGiftCode');
      localStorage.removeItem('pendingGiftPlan');
      localStorage.removeItem('pendingInviteToken');
      localStorage.removeItem('pendingPlanSelection');
      sessionStorage.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('chores2026_') || key.startsWith('sb-') || key.startsWith('choregami_')) {
          localStorage.removeItem(key);
        }
      });
    } catch(e) {}

    // Auto-submit to POST
    setTimeout(() => { document.getElementById('logoutForm').submit(); }, 100);
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  },
};

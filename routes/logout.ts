/**
 * Logout Route - Clear all session data and redirect to login
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

export const handler: Handlers = {
  async GET(req) {
    console.log("🚪 Logout requested");

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
        await supabase.auth.signOut();
        console.log("✅ Supabase session invalidated");
      }
    } catch (e) {
      console.log("⚠️ Could not invalidate Supabase session:", e);
    }

    // Clear ALL authentication cookies
    const isLocalhost = req.url.includes("localhost");
    const secure = isLocalhost ? "" : "Secure; ";
    const expire = "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

    const clearCookies = [
      `sb-access-token=; Path=/; ${secure}SameSite=Lax; ${expire}`,
      `sb-refresh-token=; Path=/; HttpOnly; ${secure}SameSite=Lax; ${expire}`,
      `active_kid_session=; Path=/; ${secure}SameSite=Lax; ${expire}`,
    ];

    console.log("✅ All cookies cleared, redirecting to login");

    // Return HTML page that clears localStorage/sessionStorage then redirects
    const html = `<!DOCTYPE html>
<html>
<head><title>Logging out...</title></head>
<body>
<script>
  // Clear all app storage
  try {
    localStorage.removeItem('chores2026_user_data');
    sessionStorage.clear();
    // Clear any other app-specific items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('chores2026_') || key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
  } catch(e) { console.log('Storage clear error:', e); }
  // Redirect to login
  window.location.href = '/login';
</script>
<noscript><meta http-equiv="refresh" content="0;url=/login"></noscript>
<p>Logging out...</p>
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

  async POST(req) {
    return handler.GET!(req, {} as any);
  },
};
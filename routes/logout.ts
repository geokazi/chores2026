/**
 * Logout Route - Clear session cookies and redirect to login
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    console.log("🚪 Logout requested");

    // Clear authentication cookies
    const isLocalhost = req.url.includes("localhost");
    const isSecure = !isLocalhost;

    // Create cookie clearing headers
    const clearCookies = [
      `sb-access-token=; Path=/; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `sb-refresh-token=; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    ];

    console.log("✅ Session cookies cleared, redirecting to login");

    // Redirect to login page
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/login",
        "Set-Cookie": clearCookies.join(", "),
      },
    });
  },

  async POST(req) {
    // Handle POST requests the same way (form submissions)
    return handler.GET!(req, {} as any);
  },
};
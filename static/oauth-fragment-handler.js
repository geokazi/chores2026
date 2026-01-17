// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * OAuth Fragment Handler
 * Handles OAuth tokens that come back as URL fragments instead of going through callback
 */

(function () {
  // Check if we have OAuth tokens in the URL fragment
  function handleOAuthFragment() {
    const hash = window.location.hash;

    if (hash && hash.includes("access_token=")) {
      console.log("🔐 OAuth tokens detected in URL fragment");

      // Parse the fragment parameters
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const providerToken = params.get("provider_token");
      const expiresAt = params.get("expires_at");

      if (accessToken) {
        console.log("🔐 Processing OAuth tokens from fragment...");

        // Extract user data from the JWT token
        try {
          const tokenParts = accessToken.split(".");
          if (tokenParts.length === 3) {
            // Decode the JWT payload
            let payload = tokenParts[1];
            while (payload.length % 4) {
              payload += "=";
            }
            payload = payload.replace(/-/g, "+").replace(/_/g, "/");

            const decoded = JSON.parse(atob(payload));
            console.log("🔐 Decoded user data:", decoded);

            // Extract user data from the JWT token
            const displayName = decoded.user_metadata?.full_name ||
              decoded.user_metadata?.name ||
              decoded.full_name ||
              decoded.name || null;

            // Create user data object
            const userData = {
              id: decoded.sub,
              email: decoded.email || null,
              phone: decoded.phone || null,
              user_metadata: {
                display_name: displayName,
                first_name: displayName?.split(" ")[0] || null,
                last_name: displayName?.split(" ").slice(1).join(" ") || null,
                avatar_url: decoded.user_metadata?.avatar_url ||
                  decoded.user_metadata?.picture ||
                  decoded.picture || null,
                full_name: displayName,
                email: decoded.email,
                email_verified: decoded.user_metadata?.email_verified ||
                  decoded.email_verified || false,
                auth_method: "oauth",
                signup_source: "social",
                oauth_provider: decoded.app_metadata?.provider || "google",
                // Include all user_metadata from JWT
                ...decoded.user_metadata,
              },
              signup_method: "oauth",
              auth_flow: "signup", // Default to signup for fragment flow
              provider: decoded.app_metadata?.provider || "google",
              stored_at: new Date().toISOString(),
            };

            console.log("🔐 Created user data object:", userData);

            // Store in localStorage
            localStorage.setItem(
              "chores2026_user_data",
              JSON.stringify(userData),
            );
            console.log("🔐 Stored user data in localStorage");

            // Set authentication cookies for server-side authentication
            if (accessToken && refreshToken) {
              try {
                // Set cookies that the server middleware expects
                const expiresAt = new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000,
                ); // 7 days
                const isLocalhost = window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1";

                // Don't use Secure flag for localhost development
                const cookieOptions = isLocalhost
                  ? `; Path=/; SameSite=Lax; Expires=${expiresAt.toUTCString()}`
                  : `; Path=/; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;

                document.cookie =
                  `sb-access-token=${accessToken}${cookieOptions}`;
                document.cookie =
                  `sb-refresh-token=${refreshToken}${cookieOptions}`;

                console.log(
                  "🔐 Set authentication cookies for server-side auth (localhost:",
                  isLocalhost,
                  ")",
                );
                console.log("🔐 Cookie options used:", cookieOptions);
                console.log("🔐 Access token length:", accessToken.length);
                console.log("🔐 Refresh token length:", refreshToken.length);

                // Verify cookies were set
                setTimeout(() => {
                  const cookies = document.cookie;
                  console.log("🔐 All cookies after setting:", cookies);
                  console.log(
                    "🔐 sb-access-token found:",
                    cookies.includes("sb-access-token"),
                  );
                  console.log(
                    "🔐 sb-refresh-token found:",
                    cookies.includes("sb-refresh-token"),
                  );
                }, 50);
              } catch (cookieError) {
                console.log("🔐 Cookie setting error:", cookieError);
              }
            }

            // Try to set the session in Supabase if available
            if (window.supabase && refreshToken) {
              try {
                window.supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                }).then((result) => {
                  console.log("🔐 Supabase session set result:", result);
                }).catch((err) => {
                  console.log("🔐 Supabase session set error:", err);
                });
              } catch (sessionError) {
                console.log("🔐 Session setting error:", sessionError);
              }
            }

            // Dispatch event for navigation component
            window.dispatchEvent(
              new CustomEvent("chores2026_user_data_updated", {
                detail: userData,
              }),
            );

            // Clean the URL
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);

            // Give the cookies time to be set, then redirect to ensure server sees auth state
            setTimeout(() => {
              console.log("🔐 Redirecting to main app...");
              window.location.href = "/";
            }, 100); // Small delay to ensure cookies are set
          } else {
            console.error("❌ Invalid JWT token format");
          }
        } catch (e) {
          console.error("❌ Error processing OAuth fragment:", e);
        }
      }
    }
  }

  // Run immediately when script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleOAuthFragment);
  } else {
    handleOAuthFragment();
  }

  // Also expose the function globally
  window.handleOAuthFragment = handleOAuthFragment;
})();

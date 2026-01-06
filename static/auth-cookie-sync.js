// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * Authentication Cookie Sync
 * Ensures authentication cookies are set when valid user data exists in localStorage
 * Runs on every page load to maintain server-side authentication state
 */

(function () {
  function syncAuthenticationCookies() {
    try {
      // Check if we have valid user data in localStorage
      const storedData = localStorage.getItem("chores2026_user_data");

      if (storedData) {
        const userData = JSON.parse(storedData);
        // console.log(
        //   "🔐 Auth Sync - Found localStorage data for user:",
        //   userData.email,
        // );

        // Check if this is OAuth user data with tokens
        if (userData.signup_method === "oauth" && userData.id) {
          // console.log(
          //   "🔐 Auth Sync - OAuth user detected, checking cookies...",
          // );

          // Check if authentication cookies are already set
          const cookies = document.cookie;
          const hasAccessToken = cookies.includes("sb-access-token");
          const hasRefreshToken = cookies.includes("sb-refresh-token");

          // console.log("🔐 Auth Sync - Cookies status:", {
          //   hasAccessToken,
          //   hasRefreshToken,
          //   allCookies: cookies,
          // });

          // If we don't have the required cookies but have OAuth user data,
          // we need to create a session using Supabase client
          if (!hasAccessToken || !hasRefreshToken) {
            // console.log(
            //   "🔐 Auth Sync - Missing cookies, attempting to restore session...",
            // );

            // Check if Supabase client is available
            if (window.supabase) {
              // Try to get current session
              window.supabase.auth.getSession().then(
                ({ data: { session }, error }) => {
                  if (session && session.access_token) {
                    // console.log(
                    //   "🔐 Auth Sync - Found active Supabase session, setting cookies...",
                    // );

                    // Set cookies that the server middleware expects
                    const expiresAt = new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000,
                    ); // 7 days
                    const isLocalhost =
                      window.location.hostname === "localhost" ||
                      window.location.hostname === "127.0.0.1";

                    const cookieOptions = isLocalhost
                      ? `; Path=/; SameSite=Lax; Expires=${expiresAt.toUTCString()}`
                      : `; Path=/; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;

                    document.cookie =
                      `sb-access-token=${session.access_token}${cookieOptions}`;
                    if (session.refresh_token) {
                      document.cookie =
                        `sb-refresh-token=${session.refresh_token}${cookieOptions}`;
                    }

                    // console.log(
                    //   "🔐 Auth Sync - Cookies set from active session, reloading page...",
                    // );

                    // Reload page to ensure server recognizes authentication
                    // CRITICAL: Add protection against infinite reload loops
                    const lastReload = sessionStorage.getItem(
                      "auth_sync_last_reload",
                    );
                    const now = Date.now();

                    // Only reload if it's been more than 10 seconds since last reload
                    if (!lastReload || (now - parseInt(lastReload)) > 10000) {
                      sessionStorage.setItem(
                        "auth_sync_last_reload",
                        now.toString(),
                      );
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    } else {
                      console.log(
                        "🔐 Auth Sync - Reload prevented (too recent)",
                      );
                    }
                  } else {
                    // console.log(
                    //   "🔐 Auth Sync - No active Supabase session found",
                    // );
                    if (error) {
                      console.log("🔐 Auth Sync - Session error:", error);
                    }
                  }
                },
              ).catch((err) => {
                console.log("🔐 Auth Sync - Error getting session:", err);
              });
            } else {
              // console.log(
              //   "🔐 Auth Sync - Supabase client not available yet, will retry...",
              // );

              // Retry after Supabase client loads - with limit to prevent infinite loops
              const retryCount = parseInt(
                sessionStorage.getItem("auth_sync_retry_count") || "0",
              );
              if (retryCount < 5) { // Max 5 retries
                sessionStorage.setItem(
                  "auth_sync_retry_count",
                  (retryCount + 1).toString(),
                );
                setTimeout(
                  syncAuthenticationCookies,
                  1000 * Math.pow(2, retryCount),
                ); // Exponential backoff
              } else {
                console.log("🔐 Auth Sync - Max retries reached, stopping");
                sessionStorage.removeItem("auth_sync_retry_count");
              }
            }
          } else {
            // console.log(
            //   "🔐 Auth Sync - Authentication cookies already present",
            // );
            // Reset retry count on success
            sessionStorage.removeItem("auth_sync_retry_count");
          }
        } else {
          //console.log("🔐 Auth Sync - Non-OAuth user or missing ID");
        }
      } else {
        //console.log("🔐 Auth Sync - No user data in localStorage");
      }
    } catch (e) {
      console.error("🔐 Auth Sync - Error:", e);
    }
  }

  // Run when script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncAuthenticationCookies);
  } else {
    syncAuthenticationCookies();
  }

  // Also run when localStorage is updated
  window.addEventListener(
    "chores2026_user_data_updated",
    syncAuthenticationCookies,
  );

  // Expose function globally for debugging
  window.syncAuthenticationCookies = syncAuthenticationCookies;
})();

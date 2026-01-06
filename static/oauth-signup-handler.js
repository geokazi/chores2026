// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * OAuth Signup Handler
 * Handles post-OAuth authentication state on signup page
 */

(function () {
  function handleOAuthSignupComplete() {
    // Check if we have OAuth user data in localStorage
    const storedData = localStorage.getItem("chores2026_user_data");

    if (storedData) {
      try {
        const userData = JSON.parse(storedData);
        console.log("🔐 OAuth user data found on signup page:", userData);

        // If we have OAuth user data, this means OAuth completed successfully
        if (userData.signup_method === "oauth" && userData.email) {
          console.log(
            "🔐 OAuth authentication completed, redirecting to welcome...",
          );

          // Check if user needs onboarding
          const hasOnboarded = userData.user_metadata?.chores2026_preferences
            ?.onboarded_at;

          if (hasOnboarded) {
            console.log(
              "🔐 User already onboarded, redirecting to main app...",
            );
            window.location.replace("/");
          } else {
            console.log("🔐 New OAuth user, redirecting to welcome screen...");
            window.location.replace("/welcome");
          }
        }
      } catch (e) {
        console.error("🔐 Error processing OAuth signup data:", e);
      }
    }
  }

  // Check when page loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleOAuthSignupComplete);
  } else {
    handleOAuthSignupComplete();
  }

  // Also listen for OAuth completion events
  window.addEventListener(
    "chores2026_user_data_updated",
    handleOAuthSignupComplete,
  );
})();

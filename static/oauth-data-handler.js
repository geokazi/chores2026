// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * OAuth Data Handler for Cross-Domain localStorage Transfer
 * Handles OAuth user data transfer from auth.choregami.app to app domain
 */

(function () {
  // Check for OAuth user data in URL parameters
  function handleOAuthDataTransfer() {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthUserData = urlParams.get("oauth_user_data");

    if (oauthUserData) {
      try {
        // Decode and store OAuth user data in localStorage
        const userData = JSON.parse(decodeURIComponent(oauthUserData));
        localStorage.setItem("chores2026_user_data", JSON.stringify(userData));

        // Clean up URL by removing the parameter
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete("oauth_user_data");
        window.history.replaceState({}, "", newUrl);

        // Dispatch event for navigation component and other listeners
        window.dispatchEvent(
          new CustomEvent("chores2026_user_data_updated", {
            detail: userData,
          }),
        );

        console.log("📋 OAuth User Data transferred and stored:", userData);

        // Return the userData for immediate use
        return userData;
      } catch (e) {
        console.error("📋 Error processing OAuth user data:", e);
      }
    }

    return null;
  }

  // Run immediately when script loads
  const oauthData = handleOAuthDataTransfer();

  // Make data available globally if needed
  if (oauthData) {
    window.chores2026UserData = oauthData;
  }

  // Also expose the function for manual calls
  window.handleOAuthDataTransfer = handleOAuthDataTransfer;
})();

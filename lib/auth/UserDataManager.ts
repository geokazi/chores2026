/**
 * User Data Manager - Centralized User Data and Session Management
 *
 * Handles user data creation, localStorage management, and proper integration
 * with CrossDomainSessionManager. Eliminates 100% duplication of user data
 * and session logic between login.tsx and signup.tsx.
 */

import type { User } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { crossDomainSessionManager } from "../user-state/CrossDomainSessionManager.ts";

export interface UserData {
  id: string;
  email: string | null;
  phone: string | null;
  user_metadata: {
    display_name?: string | null;
    auth_method?: string;
    signup_source?: string;
    product_context?: string;
    [key: string]: any;
  };
  signup_method: "email" | "phone" | "phone_otp" | "oauth";
  auth_flow: "login" | "signup";
  stored_at: string;
  unified_session_id?: string;
  cross_domain_synced?: boolean;
}

export type AuthFlow = "login" | "signup";
export type SignupMethod = "email" | "phone" | "phone_otp" | "oauth";

export class UserDataManager {
  /**
   * Create standardized user data object
   * Eliminates 100% duplication of user data creation logic
   */
  static createUserData(
    user: User,
    authFlow: AuthFlow,
    additionalData?: Record<string, any>,
  ): UserData {
    const signupMethod = this.determineSignupMethod(user, authFlow);
    const authMethod = this.determineAuthMethod(user, signupMethod);
    const displayName = this.extractDisplayName(user, signupMethod);

    // Resolve phone: explicit field or extracted from placeholder email
    let resolvedPhone = user.phone || null;
    if (!resolvedPhone && user.email) {
      const phoneMatch = user.email.match(/^(\+?\d+)@phone\./);
      if (phoneMatch) resolvedPhone = phoneMatch[1];
    }

    return {
      id: user.id,
      email: user.email || null,
      phone: resolvedPhone,
      user_metadata: {
        display_name: displayName,
        auth_method: authMethod,
        signup_source: authFlow === "signup" ? "direct" : "returning",
        product_context: "chores2026",
        ...user.user_metadata,
        ...additionalData,
      },
      signup_method: signupMethod,
      auth_flow: authFlow,
      stored_at: new Date().toISOString(),
    };
  }

  /**
   * Store user session in localStorage with proper error handling
   * Eliminates 100% duplication of localStorage management
   */
  static storeUserSession(userData: UserData): void {
    try {
      // Store in the standard chores2026_user_data key
      localStorage.setItem("chores2026_user_data", JSON.stringify(userData));

      console.log(
        `📋 ${userData.auth_flow}: Stored user data in localStorage`,
        {
          userId: userData.id,
          signupMethod: userData.signup_method,
          authMethod: userData.user_metadata.auth_method,
          displayName: userData.user_metadata.display_name,
        },
      );

      // Dispatch custom event for navigation component to update immediately
      try {
        window.dispatchEvent(new CustomEvent("chores2026_user_data_updated"));
        console.log("📋 Dispatched user data update event for navigation");
      } catch (eventError) {
        console.warn("Failed to dispatch user data update event:", eventError);
      }
    } catch (error) {
      console.error("📋 Failed to store user data in localStorage:", error);
      // Don't fail the authentication flow for localStorage issues
      // The session cookies will still work for server-side authentication
    }
  }

  /**
   * Enhanced integration with CrossDomainSessionManager
   * Leverages existing infrastructure instead of creating parallel systems
   */
  static async integrateWithCrossDomainSession(
    userData: UserData,
  ): Promise<UserData> {
    try {
      // Get unified session ID from CrossDomainSessionManager
      const sessionId = crossDomainSessionManager.getUnifiedSessionId();

      // Enhanced user data with cross-domain session correlation
      const enhancedUserData: UserData = {
        ...userData,
        unified_session_id: sessionId,
        cross_domain_synced: crossDomainSessionManager.isSessionSynced(),
      };

      // Update localStorage with enhanced data
      localStorage.setItem(
        "chores2026_user_data",
        JSON.stringify(enhancedUserData),
      );

      console.log("📋 Integrated with CrossDomainSessionManager:", {
        userId: userData.id,
        unifiedSessionId: sessionId,
        crossDomainSynced: enhancedUserData.cross_domain_synced,
      });

      // Handle async session sync if needed
      if (!crossDomainSessionManager.isSessionSynced()) {
        console.log("📋 Waiting for cross-domain session sync...");

        // Don't await this - let it complete in background
        crossDomainSessionManager.waitForSync().then((syncedSessionId) => {
          console.log(
            "📋 Cross-domain session sync completed:",
            syncedSessionId,
          );

          // Update user data with synced session ID
          const updatedData: UserData = {
            ...enhancedUserData,
            unified_session_id: syncedSessionId,
            cross_domain_synced: true,
          };

          localStorage.setItem(
            "chores2026_user_data",
            JSON.stringify(updatedData),
          );

          // Dispatch another update event
          window.dispatchEvent(
            new CustomEvent("chores2026_user_data_updated"),
          );
        }).catch((syncError) => {
          console.warn("📋 Cross-domain session sync failed:", syncError);
        });
      }

      return enhancedUserData;
    } catch (error) {
      console.error(
        "📋 Failed to integrate with CrossDomainSessionManager:",
        error,
      );
      // Return original user data if integration fails
      return userData;
    }
  }

  /**
   * Extract display name from user data based on authentication method
   * Handles OAuth, email, and phone user name extraction consistently
   */
  private static extractDisplayName(
    user: User,
    signupMethod: SignupMethod,
  ): string | null {
    // Check if display name already exists in user metadata
    if (user.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }

    // For OAuth users, try to extract from provider data
    if (signupMethod === "oauth") {
      // Google OAuth users
      if (user.user_metadata?.full_name) {
        return user.user_metadata.full_name;
      }

      // Facebook OAuth users
      if (user.user_metadata?.name) {
        return user.user_metadata.name;
      }

      // Fallback to email prefix for OAuth without name
      if (user.email) {
        return this.generateDisplayNameFromEmail(user.email);
      }
    }

    // For email users, extract from email prefix
    if (signupMethod === "email" && user.email) {
      return this.generateDisplayNameFromEmail(user.email);
    }

    // For phone users, create a simple identifier
    if (signupMethod === "phone_otp" && user.phone) {
      const last4 = user.phone.slice(-4);
      return `User ${last4}`;
    }

    // No display name could be determined
    return null;
  }

  /**
   * Generate a clean display name from email address
   */
  private static generateDisplayNameFromEmail(email: string): string {
    try {
      const emailPrefix = email.split("@")[0];

      // Clean up common email patterns
      return emailPrefix
        .replace(/[._-]/g, " ") // Replace separators with spaces
        .replace(/\d+/g, "") // Remove numbers
        .trim() // Remove extra whitespace
        .split(" ") // Split into words
        .filter((word) => word.length > 0) // Remove empty words
        .map((word) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ) // Capitalize each word
        .join(" "); // Join back together
    } catch (error) {
      console.warn("Failed to generate display name from email:", error);
      return email.split("@")[0]; // Fallback to raw email prefix
    }
  }

  /**
   * Determine the primary signup method based on user properties
   */
  private static determineSignupMethod(
    user: User,
    authFlow: AuthFlow,
  ): SignupMethod {
    // Check user metadata first
    if (user.user_metadata?.auth_method) {
      const authMethod = user.user_metadata.auth_method;
      if (authMethod === "phone_otp") return "phone_otp";
      if (authMethod === "email") return "email";
      if (authMethod === "oauth") return "oauth";
    }

    // Check app metadata for OAuth providers
    if (user.app_metadata?.provider && user.app_metadata.provider !== "email") {
      return "oauth";
    }

    if (user.app_metadata?.providers?.length) {
      const providers = user.app_metadata.providers;
      if (providers.includes("google") || providers.includes("facebook")) {
        return "oauth";
      }
      if (providers.includes("phone")) {
        return "phone_otp";
      }
    }

    // Fallback logic based on user properties
    if (user.phone && (!user.email || user.email === "")) {
      return "phone";
    }

    if (user.phone_confirmed_at) {
      return "phone";
    }

    // Detect phone-as-email placeholder pattern (legacy mealplanner users)
    if (user.email && /\@phone\./i.test(user.email)) {
      return "phone";
    }

    // Default to email
    return "email";
  }

  /**
   * Determine the authentication method for consistent metadata
   */
  private static determineAuthMethod(
    user: User,
    signupMethod: SignupMethod,
  ): string {
    // Use existing auth_method if available
    if (user.user_metadata?.auth_method) {
      return user.user_metadata.auth_method;
    }

    // Map signup method to auth method
    switch (signupMethod) {
      case "phone_otp":
        return "phone_otp";
      case "email":
        return "email";
      case "oauth":
        // Try to be more specific about OAuth provider
        if (user.app_metadata?.provider) {
          return `oauth_${user.app_metadata.provider}`;
        }
        return "oauth";
      default:
        return "unknown";
    }
  }

  /**
   * Retrieve stored user data from localStorage
   */
  static getStoredUserData(): UserData | null {
    try {
      const storedData = localStorage.getItem("chores2026_user_data");
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error(
        "📋 Failed to retrieve user data from localStorage:",
        error,
      );
    }
    return null;
  }

  /**
   * Clear stored user data (for logout)
   */
  static clearStoredUserData(): void {
    try {
      localStorage.removeItem("chores2026_user_data");
      console.log("📋 Cleared user data from localStorage");

      // Dispatch update event
      window.dispatchEvent(new CustomEvent("chores2026_user_data_updated"));
    } catch (error) {
      console.error("📋 Failed to clear user data from localStorage:", error);
    }
  }
}

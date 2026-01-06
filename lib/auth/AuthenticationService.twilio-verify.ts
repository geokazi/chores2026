/**
 * Authentication Service - Updated for Twilio Verify
 *
 * Replaces Supabase phone authentication with direct Twilio Verify integration
 * to bypass A2P 10DLC requirements for verification codes
 */

import { createServerSupabaseClient } from "../../utils/supabase-client.ts";
import { getTwilioVerifyClient } from "../twilio-client.ts";
import { getServiceSupabaseClient } from "../supabase.ts";
import type {
  Session,
  SupabaseClient,
  User,
} from "https://esm.sh/@supabase/supabase-js@2.79.0";

// Store pending verifications temporarily (in production, use Redis/DB)
const pendingVerifications = new Map<string, {
  phone: string;
  context: AuthContext;
  timestamp: number;
}>();

export interface AuthContext {
  flow: "login" | "signup";
  planSelection?: {
    plan_id: string;
    billing_cycle: string;
    selected_at: string;
    source: string;
  };
  additionalMetadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: {
    type:
      | "rate_limited"
      | "invalid_credentials"
      | "user_exists"
      | "invalid_otp"
      | "technical_error"
      | "phone_not_found";
    message: string;
    code?: string;
    status?: number;
  };
  requiresOTP?: boolean;
  requiresConfirmation?: boolean;
}

export interface SessionResult {
  success: boolean;
  response: Response;
  userData?: any;
}

export class AuthenticationService {
  private supabase: SupabaseClient;
  private request: Request;
  private twilioVerify = getTwilioVerifyClient();

  constructor(request: Request) {
    this.request = request;
    this.supabase = getServiceSupabaseClient() as any;
  }

  private async getSupabaseClient(): Promise<SupabaseClient> {
    // Always return the service role client set in constructor
    // Don't override with anon key client for admin operations
    return this.supabase;
  }

  /**
   * Send Phone OTP using Twilio Verify (replaces Supabase phone auth)
   */
  async sendPhoneOTP(phone: string, context: AuthContext): Promise<AuthResult> {
    try {
      // For login flow, verify phone number exists in Supabase using Auth Admin API
      if (context.flow === "login") {
        const supabase = this.supabase; // Use service role client
        console.log(
          "🔍 LOGIN: Checking for existing user with phone:",
          phone.substring(0, 8) + "***",
        );

        // Use Auth Admin API to list users by phone
        const { data: { users }, error: queryError } = await supabase.auth.admin
          .listUsers({
            page: 1,
            perPage: 1000, // High limit to search all users
          });

        if (queryError) {
          console.error("🚫 LOGIN: Auth admin query error:", queryError);
          return {
            success: false,
            error: {
              type: "technical_error",
              message: "Unable to verify account. Please try again.",
            },
          };
        }

        // Try exact match first
        let existingUser = users?.find((user) => user.phone === phone);

        // If no exact match, try normalized phone comparison
        if (!existingUser) {
          const normalizePhone = (phoneStr: string) =>
            phoneStr?.replace(/[\s\-\(\)\+]/g, "") || "";
          const normalizedSearch = normalizePhone(phone);
          existingUser = users?.find((user) =>
            normalizePhone(user.phone || "") === normalizedSearch
          );

          if (existingUser) {
            console.log("✅ LOGIN: Found user with normalized phone match");
          }
        }

        if (!existingUser) {
          console.log("🚫 LOGIN: No user found with phone number");
          return {
            success: false,
            error: {
              type: "phone_not_found",
              message:
                "No account found with this phone number. Please sign up first.",
            },
          };
        }

        console.log("✅ LOGIN: User exists, proceeding with OTP send");
      }

      // Send verification using Twilio Verify
      const verifyResult = await this.twilioVerify.sendVerification(phone);

      if (!verifyResult.success) {
        return {
          success: false,
          error: {
            type: "technical_error",
            message: verifyResult.error || "Failed to send verification code",
          },
        };
      }

      // Store verification context for later use
      const verificationKey = `${phone}:${Date.now()}`;
      pendingVerifications.set(verificationKey, {
        phone,
        context,
        timestamp: Date.now(),
      });

      // Clean up old verifications (older than 10 minutes)
      this.cleanupOldVerifications();

      return {
        success: true,
        requiresOTP: true,
      };
    } catch (error) {
      console.error("Twilio Verify send error:", error);
      return {
        success: false,
        error: {
          type: "technical_error",
          message: "Failed to send verification code. Please try again.",
        },
      };
    }
  }

  /**
   * Verify Phone OTP using Twilio Verify and create/login Supabase user
   */
  async verifyPhoneOTP(
    phone: string,
    otp: string,
    context: AuthContext,
  ): Promise<AuthResult> {
    try {
      // Verify code with Twilio - with retry for pending status
      console.log("🔍 Verifying OTP:", {
        phone: phone.substring(0, 8) + "***",
        otp: otp.substring(0, 2) + "**",
      });

      let verifyResult = await this.twilioVerify.verifyCode(phone, otp);
      console.log("🔍 Twilio verify result:", {
        success: verifyResult.success,
        valid: verifyResult.valid,
        status: verifyResult.status,
        error: verifyResult.error,
      });

      // If verification returns valid: false but status is "pending", retry once
      if (
        verifyResult.success && !verifyResult.valid &&
        verifyResult.status === "pending"
      ) {
        console.log(
          "⏳ Verification status 'pending', retrying after 2 seconds...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        verifyResult = await this.twilioVerify.verifyCode(phone, otp);
        console.log("🔍 Twilio verify retry result:", {
          success: verifyResult.success,
          valid: verifyResult.valid,
          status: verifyResult.status,
          error: verifyResult.error,
        });
      }

      if (!verifyResult.success) {
        console.error("🚫 Twilio verification failed:", verifyResult.error);
        return {
          success: false,
          error: {
            type: "invalid_otp",
            message: verifyResult.error || "Verification failed",
          },
        };
      }

      if (!verifyResult.valid) {
        console.error("🚫 Twilio code invalid:", {
          phone,
          valid: verifyResult.valid,
        });
        return {
          success: false,
          error: {
            type: "invalid_otp",
            message: "Invalid verification code. Please check and try again.",
          },
        };
      }

      // Use service role client for admin operations (user creation)
      const supabase = this.supabase; // This was set in constructor with getServiceSupabaseClient()

      if (context.flow === "signup") {
        // Check if user already exists first using Auth Admin API
        console.log(
          "🔍 SIGNUP: Checking for existing user with phone:",
          phone.substring(0, 8) + "***",
        );

        // Use Auth Admin API to list users by phone
        const { data: { users }, error: queryError } = await supabase.auth.admin
          .listUsers({
            page: 1,
            perPage: 1000, // High limit to search all users
          });

        if (queryError) {
          console.error("🚫 SIGNUP: Auth admin query error:", queryError);
          return {
            success: false,
            error: {
              type: "technical_error",
              message: "Unable to verify account. Please try again.",
            },
          };
        }

        // Try exact match first
        let existingUser = users?.find((user) => user.phone === phone);

        // If no exact match, try normalized phone comparison
        if (!existingUser) {
          const normalizePhone = (phoneStr: string) =>
            phoneStr?.replace(/[\s\-\(\)\+]/g, "") || "";
          const normalizedSearch = normalizePhone(phone);
          existingUser = users?.find((user) =>
            normalizePhone(user.phone || "") === normalizedSearch
          );

          if (existingUser) {
            console.log("✅ SIGNUP: Found user with normalized phone match");
          }
        }

        if (existingUser) {
          console.log("🚫 SIGNUP: User already exists with this phone number");
          return {
            success: false,
            error: {
              type: "user_exists",
              message:
                "An account with this phone number already exists. Please sign in instead.",
            },
          };
        }

        console.log(
          "✅ SIGNUP: No existing user found, proceeding with signup",
        );

        // For signup: create new user in Supabase with phone number
        const { data, error } = await supabase.auth.admin.createUser({
          phone: phone,
          phone_confirm: true, // Skip email confirmation since we verified via Twilio
          user_metadata: {
            product_context: "chores2026",
            signup_source: "phone",
            auth_method: "phone_otp",
            signup_timestamp: new Date().toISOString(),
            selected_plan: context.planSelection,
            ...context.additionalMetadata,
          },
        });

        if (error) {
          console.error("Supabase user creation error:", error);

          // Handle specific phone already exists error
          if (
            error.message?.includes("already registered") ||
            error.message?.includes("phone_exists")
          ) {
            return {
              success: false,
              error: {
                type: "user_exists",
                message:
                  "An account with this phone number already exists. Please sign in instead.",
              },
            };
          }

          return {
            success: false,
            error: {
              type: "technical_error",
              message: "Account creation failed. Please try again.",
            },
          };
        }

        // Create a session for the new user using email-based approach
        const { data: sessionData, error: sessionError } = await supabase.auth
          .admin.generateLink({
            type: "magiclink",
            email: `${phone}@phone.chores2026.internal`,
          });

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          return {
            success: false,
            error: {
              type: "technical_error",
              message:
                "Account created but login failed. Please try logging in.",
            },
          };
        }

        return {
          success: true,
          user: data.user || undefined,
          // Note: generateLink doesn't return session, handle session separately
          session: undefined,
        };
      } else {
        // For login: sign in existing user - use same method as earlier check
        console.log(
          "🔍 LOGIN (verify): Confirming user exists with phone:",
          phone.substring(0, 8) + "***",
        );

        // Use Auth Admin API to find user (same method as in sendPhoneOTP)
        const { data: { users }, error: queryError } = await supabase.auth.admin
          .listUsers({
            page: 1,
            perPage: 1000, // High limit to search all users
          });

        // Debug: Log first few users with phone numbers (masked)
        const phoneUsers = users?.filter((u) => u.phone).slice(0, 5).map(
          (u) => ({
            id: u.id,
            phone: u.phone?.substring(0, 8) + "***",
            email: u.email?.substring(0, 3) + "***",
          }),
        );
        console.log("🔍 LOGIN (verify): Sample users with phones:", phoneUsers);
        console.log("🔍 LOGIN (verify): Searching for exact phone:", phone);

        // Find user with matching phone number - try multiple formats
        console.log("🔍 LOGIN (verify): All users with phone numbers:");
        const usersWithPhones = users?.filter((u) => u.phone);
        usersWithPhones?.forEach((user, idx) => {
          console.log(
            `  User ${idx + 1}: phone="${user.phone}", email="${
              user.email?.substring(0, 5)
            }***"`,
          );
        });

        // Try exact match first
        let existingUser = users?.find((user) => user.phone === phone);

        // If no exact match, try normalized phone comparison
        if (!existingUser) {
          const normalizePhone = (phoneStr: string) =>
            phoneStr?.replace(/[\s\-\(\)\+]/g, "") || "";
          const normalizedSearch = normalizePhone(phone);
          console.log(
            "🔍 LOGIN (verify): Trying normalized phone search:",
            normalizedSearch,
          );

          existingUser = users?.find((user) =>
            normalizePhone(user.phone || "") === normalizedSearch
          );

          if (existingUser) {
            console.log(
              "✅ LOGIN (verify): Found user with normalized phone match:",
              {
                stored: existingUser.phone,
                searched: phone,
                normalized: normalizedSearch,
              },
            );
          }
        }

        if (!existingUser) {
          console.log(
            "🚫 LOGIN (verify): No user found with phone number (tried exact and normalized)",
          );
          return {
            success: false,
            error: {
              type: "phone_not_found",
              message: "No account found with this phone number.",
            },
          };
        }

        console.log(
          "✅ LOGIN (verify): User confirmed, proceeding with session creation",
        );

        // Create login session using admin API with email approach
        console.log(
          "🔧 LOGIN (verify): Creating session for user:",
          existingUser.id,
        );
        const sessionEmail = `${phone}@phone.chores2026.internal`;
        console.log("🔧 LOGIN (verify): Using session email:", sessionEmail);

        const { data: sessionData, error: sessionError } = await supabase.auth
          .admin.generateLink({
            type: "magiclink",
            email: sessionEmail,
          });

        if (sessionError) {
          console.error("🚫 LOGIN (verify): Session error:", sessionError);
          console.error("🚫 LOGIN (verify): Session error details:", {
            message: sessionError.message,
            status: sessionError.status,
            code: sessionError.code,
          });
          return {
            success: false,
            error: {
              type: "technical_error",
              message: "Login failed. Please try again.",
            },
          };
        }

        console.log("✅ LOGIN (verify): Session created successfully:", {
          hasUser: !!sessionData?.user,
          userId: sessionData?.user?.id,
          email: sessionData?.user?.email,
        });

        return {
          success: true,
          user: sessionData.user || undefined,
          // Note: generateLink doesn't return session, handle session separately
          session: undefined,
        };
      }
    } catch (error) {
      console.error("Phone OTP verification error:", error);
      return {
        success: false,
        error: {
          type: "technical_error",
          message: "Failed to verify code. Please try again.",
        },
      };
    }
  }

  /**
   * Email authentication for login (unchanged)
   */
  async authenticateWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        user: data.user || undefined,
        session: data.session || undefined,
      };
    } catch (error) {
      console.error("Email authentication error:", error);
      return {
        success: false,
        error: {
          type: "technical_error",
          message: "Login failed. Please try again.",
        },
      };
    }
  }

  /**
   * Email signup (unchanged)
   */
  async signupWithEmail(
    email: string,
    password: string,
    context: AuthContext,
  ): Promise<AuthResult> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            product_context: "chores2026",
            signup_source: "email",
            auth_method: "email_password",
            signup_timestamp: new Date().toISOString(),
            selected_plan: context.planSelection,
            ...context.additionalMetadata,
          },
        },
      });

      if (error) {
        return this.handleSupabaseError(error);
      }

      if (!data.session && data.user && !data.user.email_confirmed_at) {
        return {
          success: true,
          requiresConfirmation: true,
          user: data.user,
        };
      }

      return {
        success: true,
        user: data.user || undefined,
        session: data.session || undefined,
      };
    } catch (error) {
      console.error("Email signup error:", error);
      return {
        success: false,
        error: {
          type: "technical_error",
          message: "Signup failed. Please try again.",
        },
      };
    }
  }

  /**
   * Create user session with proper cookie management and redirect logic
   */
  async createUserSession(
    user: User,
    authFlow: "login" | "signup",
    session?: Session,
  ): Promise<SessionResult> {
    try {
      // Determine redirect URL based on onboarding status
      const hasOnboardingData = user?.user_metadata?.chores2026_preferences
        ?.onboarded_at;
      const redirectUrl = hasOnboardingData ? "/" : "/welcome";

      console.log(`${authFlow} redirect:`, {
        hasOnboardingData,
        redirectUrl,
        onboardedAt: user?.user_metadata?.chores2026_preferences?.onboarded_at,
        userMetadata: user?.user_metadata,
      });

      // For phone auth, we don't have a session from generateLink
      // But we need to create auth cookies like email auth does
      if (!session) {
        console.log(`🔀 ${authFlow}: Creating HTML response with auth cookies`);

        // Create a proper Supabase session for phone auth
        // Use the same sessionData we already generated successfully
        console.log("🔧 Phone auth: Using existing sessionData for cookies");

        // Create actual session tokens for phone auth
        // Use admin.createUser to generate a proper session with tokens
        console.log("🔧 Phone auth: Creating proper session with tokens");

        // Initialize authCookies outside try block
        let authCookies = [];
        const isLocalhost = this.request.url.includes("localhost");
        const isSecure = !isLocalhost;

        try {
          // Create a session by generating a strong temporary password and signing in
          const tempPassword = `TempAuth${user.id.slice(-4)}${Date.now()}!`;
          const userEmail = user.email ||
            `${user.phone || user.id}@phone.chores2026.internal`;

          // First, update the user to have a temporary password and confirm email
          const { data: updateData, error: updateError } = await this.supabase
            .auth.admin.updateUserById(
              user.id,
              {
                password: tempPassword,
                email_confirm: true, // Confirm email since we verified via phone
              },
            );

          if (updateError) {
            console.error("❌ Failed to update user password:", updateError);
            throw updateError;
          }

          // Now sign in with the password to get a real session
          const { data: signInData, error: signInError } = await this.supabase
            .auth.signInWithPassword({
              email: userEmail,
              password: tempPassword,
            });

          if (signInError) {
            console.error("❌ Failed to sign in for session:", signInError);
            throw signInError;
          }

          console.log("✅ Phone auth: Created real session", {
            hasUser: !!signInData.user,
            hasSession: !!signInData.session,
            hasAccessToken: !!signInData.session?.access_token,
            hasRefreshToken: !!signInData.session?.refresh_token,
          });

          // Create proper Supabase auth cookies from the real session
          if (signInData.session) {
            authCookies = [
              `sb-access-token=${signInData.session.access_token}; Path=/; ${
                isSecure ? "Secure; " : ""
              }SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
              `sb-refresh-token=${signInData.session.refresh_token}; Path=/; HttpOnly; ${
                isSecure ? "Secure; " : ""
              }SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
            ];

            console.log("✅ Phone auth: Created real Supabase session cookies");
          } else {
            throw new Error("No session returned from sign in");
          }
        } catch (sessionError) {
          console.error(
            "❌ Phone auth: Failed to create real session:",
            sessionError,
          );

          // Fallback: Create a basic auth cookie
          authCookies = [
            `phone-auth-user=${user.id}; Path=/; ${
              isSecure ? "Secure; " : ""
            }SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
          ];
          console.log(
            "⚠️ Phone auth: Using fallback cookie due to session creation failure",
          );
        }

        const response = new Response(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Redirecting...</title>
            <meta http-equiv="refresh" content="2;url=${redirectUrl}">
          </head>
          <body>
            <script>
              console.log('📋 ${authFlow}: Phone authentication successful, redirecting to ${redirectUrl}');
              console.log('📋 Current URL before redirect:', window.location.href);
              
              // Try multiple redirect methods
              setTimeout(function() {
                console.log('📋 Attempting redirect to: ${redirectUrl}');
                window.location.href = '${redirectUrl}';
              }, 1000);
              
              // Fallback
              setTimeout(function() {
                if (window.location.pathname !== '${redirectUrl}') {
                  console.log('📋 Fallback redirect attempt');
                  window.location.replace('${redirectUrl}');
                }
              }, 3000);
            </script>
            <p>${
            authFlow === "login" ? "Login" : "Signup"
          } successful! Redirecting to ${redirectUrl}...</p>
            <p><a href="${redirectUrl}">Click here if redirect doesn't work</a></p>
          </body>
          </html>
        `,
          {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "Set-Cookie": authCookies.join(", "),
            },
          },
        );

        return {
          success: true,
          response,
          userData: {
            redirectUrl,
            authFlow,
            hasOnboarding: hasOnboardingData,
          },
        };
      }

      // Determine environment for cookie security
      const isLocalhost = this.request.url.includes("localhost");
      const isSecure = !isLocalhost;

      // Create authentication cookies
      const authCookies = [
        `sb-access-token=${session.access_token}; Path=/; ${
          isSecure ? "Secure; " : ""
        }SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
        `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; ${
          isSecure ? "Secure; " : ""
        }SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`, // 30 days
      ];

      // Create HTML response with localStorage integration and redirect
      const response = new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
        </head>
        <body>
          <script>
            // This will be handled by UserDataManager
            console.log('📋 ${authFlow}: Authentication successful, redirecting to ${redirectUrl}');
            window.location.href = '${redirectUrl}';
          </script>
          <p>${
          authFlow === "login" ? "Login" : "Signup"
        } successful! Redirecting...</p>
        </body>
        </html>
      `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            "Set-Cookie": authCookies.join(", "),
          },
        },
      );

      return {
        success: true,
        response,
        userData: {
          redirectUrl,
          authFlow,
          hasOnboarding: hasOnboardingData,
        },
      };
    } catch (error) {
      console.error("Session creation error:", error);

      // Fallback to simple redirect
      return {
        success: false,
        response: new Response(null, {
          status: 303,
          headers: { Location: authFlow === "login" ? "/" : "/signup" },
        }),
      };
    }
  }

  /**
   * Handle Supabase errors (unchanged)
   */
  private handleSupabaseError(error: any): AuthResult {
    console.error("Supabase error:", error);

    // Map common Supabase error messages to user-friendly responses
    const errorMessage = error.message?.toLowerCase() || "";

    if (errorMessage.includes("invalid login credentials")) {
      return {
        success: false,
        error: {
          type: "invalid_credentials",
          message: "Invalid email or password. Please check and try again.",
        },
      };
    }

    if (errorMessage.includes("user already registered")) {
      return {
        success: false,
        error: {
          type: "user_exists",
          message: "Account already exists. Please sign in instead.",
        },
      };
    }

    if (errorMessage.includes("rate limit")) {
      return {
        success: false,
        error: {
          type: "rate_limited",
          message: "Too many attempts. Please wait before trying again.",
        },
      };
    }

    return {
      success: false,
      error: {
        type: "technical_error",
        message: "Authentication failed. Please try again.",
      },
    };
  }

  /**
   * Clean up old verification attempts
   */
  private cleanupOldVerifications() {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, verification] of pendingVerifications) {
      if (verification.timestamp < tenMinutesAgo) {
        pendingVerifications.delete(key);
      }
    }
  }
}

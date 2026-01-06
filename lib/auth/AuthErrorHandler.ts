/**
 * Authentication Error Handler - Standardized Error Management
 *
 * Centralizes error handling, user messaging, and redirect patterns across
 * all authentication flows. Eliminates 100% duplication of error handling
 * logic between login.tsx and signup.tsx.
 */

import type { AuthResult } from "./AuthenticationService.twilio-verify.ts";
import { ParameterSanitizer } from "./ParameterSanitizer.ts";
import { SecurityMonitor } from "./SecurityMonitor.ts";

export interface StandardAuthError {
  type:
    | "rate_limited"
    | "invalid_credentials"
    | "user_exists"
    | "invalid_otp"
    | "technical_error"
    | "phone_not_found";
  userMessage: string;
  redirectParams: Record<string, string>;
  logContext: any;
  shouldLog: boolean;
}

export interface AuthContext {
  flow: "login" | "signup";
  mode?: "email" | "phone" | "social";
  additionalParams?: Record<string, string>;
}

export class AuthErrorHandler {
  /**
   * Format authentication errors into standardized structure
   * Eliminates 100% duplication of error categorization logic
   */
  static formatAuthError(
    authResult: AuthResult,
    context: AuthContext,
  ): StandardAuthError {
    if (!authResult.error) {
      throw new Error("Cannot format error for successful auth result");
    }

    const error = authResult.error;

    // Build redirect parameters - SECURITY: Sanitize all parameters before use
    const unsanitizedParams = {
      error: this.getUrlErrorCode(error.type), // Convert error type to URL-friendly format
      mode: context.mode || "email",
      ...context.additionalParams,
    };

    // ✅ SECURE: Use sanitization to prevent sensitive data exposure
    const redirectParams = ParameterSanitizer.sanitizeAuthParams(
      unsanitizedParams,
    );

    // Create standardized error object
    const standardError: StandardAuthError = {
      type: error.type,
      userMessage: error.message,
      redirectParams,
      logContext: {
        flow: context.flow,
        mode: context.mode,
        errorCode: error.code,
        errorStatus: error.status,
        timestamp: new Date().toISOString(),
      },
      shouldLog: true,
    };

    // Enhance error details based on type
    switch (error.type) {
      case "rate_limited":
        standardError.userMessage =
          "Too many attempts. Please try again in a few minutes.";
        standardError.shouldLog = true; // Security concern
        break;

      case "invalid_credentials":
        standardError.userMessage = context.flow === "login"
          ? "Invalid email or password. Please try again."
          : "These credentials are already associated with an account. Try logging in instead.";
        standardError.shouldLog = false; // Common user error
        break;

      case "user_exists":
        standardError.userMessage = context.mode === "phone"
          ? "An account with this phone number already exists. Try logging in instead."
          : "An account with this email already exists. Try logging in instead.";
        standardError.redirectParams = {
          ...redirectParams,
          suggestion: "try_login",
        };
        standardError.shouldLog = false; // Common user flow
        break;

      case "invalid_otp":
        standardError.userMessage =
          "Invalid verification code. Please try again.";
        standardError.shouldLog = false; // Common user error
        break;

      case "phone_not_found":
        standardError.userMessage =
          "No account found with this phone number. Try signing up instead.";
        standardError.redirectParams = {
          ...redirectParams,
          suggestion: "try_signup",
        };
        standardError.shouldLog = false; // Common user flow
        break;

      case "technical_error":
      default:
        standardError.userMessage = context.flow === "login"
          ? "Login failed. Please try again."
          : "Signup failed. Please try again.";
        standardError.shouldLog = true; // Technical issues need investigation
        break;
    }

    return standardError;
  }

  /**
   * Create error redirect responses with consistent URL encoding
   * Eliminates 100% duplication of redirect logic
   */
  static createErrorRedirect(
    error: StandardAuthError,
    basePath: string,
    context?: AuthContext,
    preserveParams: string[] = [],
  ): Response {
    const url = new URL(basePath, "http://localhost"); // Base URL for URL construction

    // Add error parameters
    Object.entries(error.redirectParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    // Preserve additional parameters if specified (also sanitized)
    preserveParams.forEach((param) => {
      if (error.redirectParams[param]) {
        url.searchParams.set(param, error.redirectParams[param]);
      }
    });

    // ✅ SECURITY CHECK: Validate URL safety before redirect
    const finalUrl = `${basePath}${url.search}`;
    const safetyCheck = ParameterSanitizer.validateUrlSafety(finalUrl);

    if (!safetyCheck.safe) {
      console.error("🚨 SECURITY VIOLATION: Sensitive data in URL parameters", {
        violations: safetyCheck.violations,
        params: error.redirectParams,
        basePath,
      });

      // Log the security violation
      ParameterSanitizer.logSecurityViolation(finalUrl, safetyCheck.violations);

      // Log to SecurityMonitor for tracking
      SecurityMonitor.logCredentialExposure(
        `AuthErrorHandler.${context?.flow || "unknown"}`,
        Object.keys(error.redirectParams),
        {
          basePath,
          violations: safetyCheck.violations,
          originalParams: error.redirectParams,
        },
      );

      // Fall back to minimal safe redirect
      return new Response(null, {
        status: 303,
        headers: {
          Location: `${basePath}?error=security-violation`,
        },
      });
    }

    // Log error if needed
    if (error.shouldLog) {
      this.logAuthError(error);
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: finalUrl,
      },
    });
  }

  /**
   * Structured logging for authentication errors
   * Provides debugging context and security monitoring
   */
  static logAuthError(error: StandardAuthError): void {
    const logLevel = error.type === "rate_limited" ? "warn" : "error";

    const logMessage = `Authentication ${error.type}`;
    const logData = {
      errorType: error.type,
      userMessage: error.userMessage,
      context: error.logContext,
      severity: this.getErrorSeverity(error.type),
    };

    if (logLevel === "warn") {
      console.warn(logMessage, logData);
    } else {
      console.error(logMessage, logData);
    }

    // Additional security logging for suspicious activity
    if (error.type === "rate_limited") {
      console.warn("🚨 Potential security event: Rate limiting triggered", {
        timestamp: new Date().toISOString(),
        context: error.logContext,
      });
    }
  }

  /**
   * Map error types to URL-friendly error codes
   */
  static getUrlErrorCode(errorType: string): string {
    const errorCodeMap: Record<string, string> = {
      "rate_limited": "rate-limit",
      "invalid_credentials": "invalid-credentials",
      "user_exists": "user-exists",
      "invalid_otp": "invalid-otp",
      "technical_error": "technical-error",
      "phone_not_found": "phone-not-found",
    };

    return errorCodeMap[errorType] || "unknown-error";
  }

  /**
   * Get user-friendly error messages for display
   */
  static getUserFriendlyMessage(
    errorCode: string,
    context: AuthContext,
  ): string {
    const messageMap: Record<string, Record<string, string>> = {
      "rate-limit": {
        login: "Too many login attempts. Please try again in a few minutes.",
        signup: "Too many signup attempts. Please try again in a few minutes.",
      },
      "invalid-credentials": {
        login: "Invalid email or password. Please try again.",
        signup: "These credentials are already in use. Try logging in instead.",
      },
      "user-exists": {
        login: "Account found. Please check your password.",
        signup:
          "An account already exists with this information. Try logging in instead.",
      },
      "invalid-otp": {
        login: "Invalid verification code. Please try again.",
        signup: "Invalid verification code. Please try again.",
      },
      "phone-not-found": {
        login:
          "No account found with this phone number. Try signing up instead.",
        signup: "No account found with this phone number.",
      },
      "technical-error": {
        login: "Login failed. Please try again.",
        signup: "Signup failed. Please try again.",
      },
    };

    const flowMessages = messageMap[errorCode];
    if (flowMessages) {
      return flowMessages[context.flow] || flowMessages.login ||
        "Please try again.";
    }

    return "Something went wrong. Please try again.";
  }

  /**
   * Determine error severity for logging and monitoring
   */
  private static getErrorSeverity(
    errorType: string,
  ): "low" | "medium" | "high" {
    switch (errorType) {
      case "rate_limited":
        return "high"; // Security concern
      case "technical_error":
        return "medium"; // System issue
      case "invalid_credentials":
      case "user_exists":
      case "invalid_otp":
      case "phone_not_found":
      default:
        return "low"; // User error
    }
  }
}

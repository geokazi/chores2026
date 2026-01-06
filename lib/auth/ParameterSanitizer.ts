/**
 * URL Parameter Sanitization for Authentication
 * Prevents sensitive data from appearing in URLs
 */

import { SecurityMonitor } from "./SecurityMonitor.ts";

export interface SanitizedAuthParams {
  error?: string;
  mode?: "email" | "phone" | "social";
  plan?: string;
  billing?: string;
  oauth_transfer_id?: string;
  // ❌ NEVER INCLUDE: email, phone, password, tokens
}

export class ParameterSanitizer {
  private static readonly ALLOWED_PARAMS: (keyof SanitizedAuthParams)[] = [
    "error",
    "mode",
    "plan",
    "billing",
    "oauth_transfer_id",
  ];

  private static readonly SENSITIVE_PATTERNS = [
    /[?&]email=/i,
    /[?&]password=/i,
    /[?&]phone=/i,
    /[?&]token=/i,
    /[?&]key=/i,
    /[?&]secret=/i,
    /@.*\.(com|org|net|gov|edu)/i, // Email address pattern
    /\+\d{10,15}/i, // Phone number pattern
    /[?&]\w*email\w*=/i, // Email parameter variants
    /[?&]\w*password\w*=/i, // Password parameter variants
    /[?&]\w*phone\w*=/i, // Phone parameter variants (excludes mode=phone)
    /[?&]otp=/i,
    /[?&]code=/i, // OTP/verification codes
    /[?&]user_data=/i, // User data parameters
    /[?&]api_key=/i, // API key parameters
    /[?&]access_token=/i, // Access token parameters
    /[?&]refresh_token=/i, // Refresh token parameters
    /%22email%22/i, // URL-encoded email in JSON
    /%40.*%2E(com|org|net)/i, // URL-encoded email address pattern
  ];

  /**
   * Sanitize parameters to prevent sensitive data exposure
   */
  static sanitizeAuthParams(
    params: Record<string, any>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const removedParams: string[] = [];
    const originalCount = Object.keys(params).length;

    // Only allow whitelisted parameters
    for (const key of this.ALLOWED_PARAMS) {
      if (params[key] !== undefined && params[key] !== null) {
        sanitized[key] = String(params[key]);
      }
    }

    // Track removed parameters for security monitoring
    for (const key in params) {
      if (!this.ALLOWED_PARAMS.includes(key as keyof SanitizedAuthParams)) {
        removedParams.push(key);
      }
    }

    // Log sanitization activity
    if (removedParams.length > 0) {
      SecurityMonitor.logParameterSanitization(
        originalCount,
        Object.keys(sanitized).length,
        removedParams,
      );
    }

    return sanitized;
  }

  /**
   * Validate that no sensitive data is present in URL parameters
   */
  static validateUrlSafety(
    url: string,
  ): { safe: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const pattern of this.SENSITIVE_PATTERNS) {
      if (pattern.test(url)) {
        violations.push(
          `Potentially sensitive parameter detected: ${pattern.source}`,
        );
      }
    }

    // Log violations to security monitor
    if (violations.length > 0) {
      this.logSecurityViolation(url, violations);
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }

  /**
   * Log security violations for monitoring
   */
  static logSecurityViolation(url: string, violations: string[]): void {
    const urlParams = new URLSearchParams(url.split("?")[1] || "");
    const suspiciousParams: string[] = [];

    // Identify specific parameter violations
    for (const [key, value] of urlParams) {
      for (const pattern of this.SENSITIVE_PATTERNS) {
        if (pattern.test(`${key}=${value}`)) {
          suspiciousParams.push(key);
          // Log individual parameter violations
          SecurityMonitor.logUrlParameterViolation(key, value, {
            url: url.replace(
              /([?&])(email|password|phone|token)=[^&]*/gi,
              "$1$2=***",
            ),
            pattern: pattern.source,
          });
        }
      }
    }

    console.error("🚨 SECURITY VIOLATION: Sensitive data in URL parameters", {
      url: url.replace(
        /([?&])(email|password|phone|token)=[^&]*/gi,
        "$1$2=***",
      ),
      violations,
      suspiciousParams,
      timestamp: new Date().toISOString(),
      environment: typeof Deno !== "undefined"
        ? Deno.env.get("ENVIRONMENT")
        : "browser",
    });
  }
}

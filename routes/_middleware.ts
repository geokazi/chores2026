/**
 * Global Rate Limiting Middleware
 *
 * Protects authentication endpoints from brute force and DDoS attacks
 * using Deno KV-based distributed rate limiting.
 */

import { FreshContext } from "$fresh/server.ts";
import { checkRateLimit, RATE_LIMITS, type RateLimitKey } from "../lib/security/rate-limiter.ts";

// Route-to-limit mapping for protected endpoints
const PROTECTED_ROUTES: Record<string, RateLimitKey> = {
  "/login": "login",
  "/register": "register",
  "/api/pin/verify": "pinVerify",
  "/api/parent/verify-pin": "pinVerify",
};

/**
 * Extract client IP address from request
 * Handles proxied requests (Fly.io, Cloudflare, etc.)
 */
function getClientIp(req: Request): string {
  // Try proxy headers first (in order of trust)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take first IP in chain (original client)
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fly.io specific header
  const flyClientIp = req.headers.get("fly-client-ip");
  if (flyClientIp) {
    return flyClientIp.trim();
  }

  return "unknown";
}

export async function handler(req: Request, ctx: FreshContext) {
  // Only rate limit POST requests
  if (req.method !== "POST") {
    return ctx.next();
  }

  const url = new URL(req.url);
  const limitKey = PROTECTED_ROUTES[url.pathname];

  // Skip if route is not protected
  if (!limitKey) {
    return ctx.next();
  }

  const ip = getClientIp(req);
  const config = RATE_LIMITS[limitKey];

  try {
    const result = await checkRateLimit(ip, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      console.warn("🚫 Rate limit exceeded:", {
        ip,
        path: url.pathname,
        limit: limitKey,
        resetIn: retryAfter,
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfter
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        }
      });
    }

    // Process request and add rate limit headers to response
    const response = await ctx.next();

    // Clone response to add headers (Response may be immutable)
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-RateLimit-Limit", String(config.maxRequests));
    newHeaders.set("X-RateLimit-Remaining", String(result.remaining));
    newHeaders.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    // Log error but don't block request if rate limiting fails
    console.error("Rate limiter error:", error);
    return ctx.next();
  }
}

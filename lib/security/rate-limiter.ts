/**
 * Rate Limiter - Deno KV-based rate limiting
 *
 * Provides distributed rate limiting for authentication endpoints
 * to protect against brute force and credential stuffing attacks.
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // KV key prefix for namespacing
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // Unix timestamp when limit resets
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;  // Unix timestamp of first request in window
}

// Singleton KV instance
let kv: Deno.Kv | null = null;

/**
 * Get or create KV instance
 */
export async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

/**
 * Check if a request is allowed under rate limits
 * Also records the request if allowed
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const kvStore = await getKv();
  const key = [config.keyPrefix, identifier];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get current count for this identifier
  const entry = await kvStore.get<RateLimitEntry>(key);

  // Case 1: No existing entry or entry expired - start new window
  if (!entry.value || entry.value.firstRequest < windowStart) {
    await kvStore.set(
      key,
      { count: 1, firstRequest: now },
      { expireIn: config.windowMs }
    );
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }

  // Case 2: Rate limit exceeded
  if (entry.value.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.value.firstRequest + config.windowMs
    };
  }

  // Case 3: Within limits - increment and allow
  await kvStore.set(
    key,
    { count: entry.value.count + 1, firstRequest: entry.value.firstRequest },
    { expireIn: config.windowMs }
  );

  return {
    allowed: true,
    remaining: config.maxRequests - entry.value.count - 1,
    resetAt: entry.value.firstRequest + config.windowMs
  };
}

/**
 * Predefined rate limit configurations
 *
 * Security-tuned limits:
 * - login: 5 attempts per minute (brute force protection)
 * - register: 3 attempts per minute (spam account prevention)
 * - pinVerify: 5 attempts per 5 minutes (4-digit PIN = 10,000 combinations)
 * - otpSend: 3 attempts per 5 minutes (SMS cost + abuse prevention)
 * - apiDefault: 60 requests per minute (general API protection)
 */
export const RATE_LIMITS = {
  login: {
    windowMs: 60_000,      // 1 minute
    maxRequests: 5,
    keyPrefix: "rl:login"
  },
  register: {
    windowMs: 60_000,      // 1 minute
    maxRequests: 3,
    keyPrefix: "rl:register"
  },
  pinVerify: {
    windowMs: 300_000,     // 5 minutes
    maxRequests: 5,
    keyPrefix: "rl:pin"
  },
  otpSend: {
    windowMs: 300_000,     // 5 minutes
    maxRequests: 3,
    keyPrefix: "rl:otp"
  },
  apiDefault: {
    windowMs: 60_000,      // 1 minute
    maxRequests: 60,
    keyPrefix: "rl:api"
  },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

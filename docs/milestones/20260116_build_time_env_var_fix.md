# Build-Time Environment Variable Fix

**Date**: January 16, 2026
**Status**: Complete

## Problem

Deployment failed during Docker build with error:

```
error: Uncaught (in promise) Error: Missing API key. Pass it to the constructor `new Resend("re_123")`
    at new Resend (file:///app/node_modules/.deno/resend@6.7.0/node_modules/resend/dist/index.mjs:786:25)
    at file:///app/lib/services/email-service.ts:9:16
```

## Root Cause

The `email-service.ts` file initialized the Resend client at **module load time**:

```typescript
// BEFORE (broken)
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
```

During `deno run -A dev.ts build` in the Dockerfile, environment variables are not available. The Resend constructor throws when no API key is provided.

## Solution

Use **lazy initialization** - only create the Resend client when it's actually needed at runtime:

```typescript
// AFTER (fixed)
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// Usage in functions:
const { data, error } = await getResend().emails.send({ ... });
```

## Key Principle

**Never instantiate services that require environment variables at module load time.** This applies to:

- API clients (Resend, Stripe, etc.)
- Database connections
- Any service requiring secrets

Use lazy initialization patterns instead:
1. Singleton with getter function
2. Factory functions
3. Dependency injection

## Files Modified

- `lib/services/email-service.ts` - Lazy Resend client initialization

## Verification

```bash
./deployment/deploy.sh
# Build succeeds, deployment completes
```

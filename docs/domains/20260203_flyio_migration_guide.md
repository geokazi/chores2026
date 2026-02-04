# Migration Guide: Google Cloud Run to Fly.io

**Date**: February 3, 2026
**Status**: Complete
**Purpose**: Migrate choregami.app from Google Cloud Run (domain mappings) to Fly.io

## Overview

This guide documents the complete migration process for moving choregami.app from Google Cloud Platform (Cloud Run with domain mappings) to Fly.io. The migration simplifies infrastructure, reduces costs, and aligns with the Deno Fresh deployment model.

## Current State

### Fly.io App (Target - Already Running)

- **App Name**: `choregami`
- **URL**: https://choregami.fly.dev
- **Primary Region**: sjc (San Jose)
- **Status**: Deployed and operational

### Fly.io IP Addresses (Confirmed)

```
VERSION    IP                        TYPE                          REGION    CREATED AT
v6         2a09:8280:1::c3:9a68:0    public ingress (dedicated)    global    Jan 13 2026 07:06
v4         66.241.125.185            public ingress (shared)                 Jan 1 0001 00:00
```

## Architecture Comparison

### Current Architecture (Google Cloud Run Domain Mappings)

```text
User → choregami.app → Squarespace DNS → Google Cloud Run IPs (216.239.x.x)
                                              ↓
                                         Cloud Run
                                         (choregami)
                                         us-central1
```

- **Cloud Run IPs**: 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21
- **Region**: us-central1
- **Project**: nruka-269205
- **SSL**: Google-managed (automatic with domain mappings)

### Target Architecture (Fly.io)

```text
User → choregami.app → Squarespace DNS → Fly.io Edge (Anycast IPs)
                                              ↓
                                         Fly Proxy
                                              ↓
                                         Fly Machine
                                         (choregami)
                                         sjc region
```

- **App Name**: choregami
- **IPv4**: 66.241.125.185
- **IPv6**: 2a09:8280:1::c3:9a68:0
- **Primary Region**: sjc (San Jose)
- **SSL**: Let's Encrypt (automatic via Fly.io)

## Current Squarespace DNS Configuration (choregami.app)

### Squarespace System Records (DO NOT MODIFY)

| Host | Type | TTL | Value | Purpose |
|------|------|-----|-------|---------|
| `_domainconnect` | CNAME | 4 hrs | `_domainconnect.domains.squarespace.com` | Squarespace internal |

### Verification Records (KEEP)

| Host | Type | TTL | Value | Purpose |
|------|------|-----|-------|---------|
| `@` | TXT | 4 hrs | `google-site-verification=u0IhraWe9Gmt283FxjrKMRBeFZYfsx1OlaXWG0AOclk` | Google Search Console |
| `@` | TXT | 4 hrs | `facebook-domain-verification=rc078bqq19b6m1jm5lp4sqtsd9fam|3` | Facebook/Meta verification |
| `_twilio` | TXT | 5 mins | `twilio-domain-verification=1e0293a7e71ad0e0964265d18ce64b` | Twilio verification |

### Other Services (KEEP - Not part of main app)

| Host | Type | TTL | Value | Purpose |
|------|------|-----|-------|---------|
| `auth` | CNAME | 5 mins | `otpedpktyvzxkadyabby.supabase.co` | Supabase Auth |
| `recipes` | CNAME | 5 mins | `ghs.googlehosted.com` | Recipe Discovery service |
| `mealplan` | CNAME | 5 mins | `ghs.googlehosted.com` | Meal planner service |
| `eat` | CNAME | 5 mins | `ghs.googlehosted.com` | Eat service |
| `blog` | A | 30 mins | `34.36.91.90` | Blog service |
| `cdn` | A | 5 mins | `34.95.103.231` | CDN service |

### Records to DELETE (Cloud Run IPs)

| Host | Type | TTL | Value | Reason |
|------|------|-----|-------|--------|
| `@` | A | 5 mins | `216.239.32.21` | Cloud Run IP - replacing with Fly.io |
| `@` | A | 5 mins | `216.239.34.21` | Cloud Run IP - replacing with Fly.io |
| `@` | A | 5 mins | `216.239.36.21` | Cloud Run IP - replacing with Fly.io |
| `@` | A | 5 mins | `216.239.38.21` | Cloud Run IP - replacing with Fly.io |
| `choregami.app` | A | 5 mins | `216.239.32.21` | Redundant with @ records |
| `www.choregami.app` | CNAME | 5 mins | `ghs.googlehosted.com` | Redundant with www record |

### Records to CHANGE

| Host | Type | Current Value | New Value |
|------|------|---------------|-----------|
| `www` | CNAME | `ghs.googlehosted.com` | `dm3x22n.choregami.fly.dev` |

### Stale Records to DELETE (Optional Cleanup)

| Host | Type | Value | Reason |
|------|------|-------|--------|
| `_acme-challenge.auth` | TXT | `Bs3LY0e5OgPeYYMDV7jD7ecFFo...` | Old Let's Encrypt challenge - no longer needed |
| `_acme-challenge.auth.choregami.app` | TXT | `Bs3LY0e5OgPeYYMDV7jD7ecFFo...` | Old Let's Encrypt challenge - no longer needed |

### Records to ADD (Fly.io)

| Host | Type | TTL | Value |
|------|------|-----|-------|
| `@` | A | 5 mins | `66.241.125.185` |
| `@` | AAAA | 5 mins | `2a09:8280:1::c3:9a68:0` |

## Migration Steps

### Phase 1: Prepare Fly.io Certificates (COMPLETED)

```bash
# Add certificates to Fly.io (already done)
fly certs add choregami.app -a choregami
fly certs add www.choregami.app -a choregami
```

**Output received:**
```
You are creating a certificate for choregami.app
We are using Let's Encrypt for this certificate.

DNS Setup recommended:
   A    @ → 66.241.125.185
   AAAA @ → 2a09:8280:1::c3:9a68:0

For www.choregami.app:
   CNAME www → dm3x22n.choregami.fly.dev
```

### Phase 2: Update DNS in Squarespace

#### Step 2.1: DELETE These Records

In Squarespace DNS settings (https://account.squarespace.com/domains/managed/choregami.app/dns/dns-settings):

1. Delete `@` A record → `216.239.32.21`
2. Delete `@` A record → `216.239.34.21`
3. Delete `@` A record → `216.239.36.21`
4. Delete `@` A record → `216.239.38.21`
5. Delete `choregami.app` A record → `216.239.32.21`
6. Delete `www.choregami.app` CNAME record → `ghs.googlehosted.com`

**Optional cleanup:**
7. Delete `_acme-challenge.auth` TXT record
8. Delete `_acme-challenge.auth.choregami.app` TXT record

#### Step 2.2: ADD These Records

Click "ADD RECORD" and add:

| Host | Type | Priority | TTL | Value |
|------|------|----------|-----|-------|
| `@` | A | N/A | 5 mins | `66.241.125.185` |
| `@` | AAAA | N/A | 5 mins | `2a09:8280:1::c3:9a68:0` |

#### Step 2.3: CHANGE www Record

Edit the existing `www` CNAME record:
- **Current**: `ghs.googlehosted.com`
- **New**: `dm3x22n.choregami.fly.dev`

### Phase 3: Verify Migration

#### Step 3.1: Check DNS Propagation

```bash
# Wait 5-15 minutes, then verify
dig choregami.app A +short
# Expected: 66.241.125.185

dig choregami.app AAAA +short
# Expected: 2a09:8280:1::c3:9a68:0

dig www.choregami.app CNAME +short
# Expected: dm3x22n.choregami.fly.dev
```

#### Step 3.2: Check Certificate Status

```bash
fly certs check choregami.app -a choregami
fly certs check www.choregami.app -a choregami

# Or view full details
fly certs show choregami.app -a choregami
```

Wait until status shows **"Ready"** (typically 5-15 minutes after DNS propagation).

#### Step 3.3: Test HTTPS Access

```bash
# Test root domain
curl -I https://choregami.app

# Test www subdomain
curl -I https://www.choregami.app

# Test specific routes
curl -I https://choregami.app/login
curl -I https://choregami.app/kid/dashboard
```

#### Step 3.4: Test Application Functionality

- [ ] Visit https://choregami.app
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Login with phone/SMS
- [ ] Kid selector loads family members
- [ ] Chore completion works
- [ ] WebSocket connections (live updates)
- [ ] Parent dashboard loads
- [ ] Reports page loads

### Phase 4: Cleanup Google Cloud (After 24-48 Hours)

**Important**: Only proceed after confirming everything works on Fly.io.

#### Step 4.1: Remove Cloud Run Domain Mapping

```bash
gcloud beta run domain-mappings delete \
  --domain=choregami.app \
  --region=us-central1 \
  --project=nruka-269205 \
  --quiet

gcloud beta run domain-mappings delete \
  --domain=www.choregami.app \
  --region=us-central1 \
  --project=nruka-269205 \
  --quiet
```

#### Step 4.2: Delete Cloud Run Service (Optional)

```bash
# Only if you want to fully decommission the Cloud Run version
gcloud run services delete choregami \
  --region=us-central1 \
  --project=nruka-269205 \
  --quiet
```

---

## Rollback Procedure

If issues occur after DNS migration, rollback to Google Cloud Run:

### Step 1: Revert DNS in Squarespace

**DELETE the Fly.io records:**
- `@` A → `66.241.125.185`
- `@` AAAA → `2a09:8280:1::c3:9a68:0`

**ADD back the Cloud Run records:**

| Host | Type | TTL | Value |
|------|------|-----|-------|
| `@` | A | 5 mins | `216.239.32.21` |
| `@` | A | 5 mins | `216.239.34.21` |
| `@` | A | 5 mins | `216.239.36.21` |
| `@` | A | 5 mins | `216.239.38.21` |
| `choregami.app` | A | 5 mins | `216.239.32.21` |

**CHANGE www back:**
- `www` CNAME → `ghs.googlehosted.com`

**ADD back www.choregami.app:**
| Host | Type | TTL | Value |
|------|------|-----|-------|
| `www.choregami.app` | CNAME | 5 mins | `ghs.googlehosted.com` |

### Step 2: Verify Cloud Run is Still Running

```bash
gcloud run services describe choregami \
  --region=us-central1 \
  --project=nruka-269205
```

### Step 3: Wait for DNS Propagation

```bash
dig choregami.app A +short
# Should return: 216.239.32.21 (and other Cloud Run IPs)
```

### Step 4: Remove Fly.io Certificates (Optional)

```bash
fly certs remove choregami.app -a choregami
fly certs remove www.choregami.app -a choregami
```

---

## DNS Configuration Summary

### Before Migration (Cloud Run)

```
choregami.app DNS Records:

@ A → 216.239.32.21      (Cloud Run)
@ A → 216.239.34.21      (Cloud Run)
@ A → 216.239.36.21      (Cloud Run)
@ A → 216.239.38.21      (Cloud Run)
choregami.app A → 216.239.32.21
www CNAME → ghs.googlehosted.com
www.choregami.app CNAME → ghs.googlehosted.com
```

### After Migration (Fly.io)

```
choregami.app DNS Records:

@ A → 66.241.125.185           (Fly.io IPv4)
@ AAAA → 2a09:8280:1::c3:9a68:0 (Fly.io IPv6)
www CNAME → dm3x22n.choregami.fly.dev
```

### Records That Stay The Same

```
# Verification (keep)
@ TXT → google-site-verification=u0IhraWe9Gmt283FxjrKMRBeFZYfsx1OlaXWG0AOclk
@ TXT → facebook-domain-verification=rc078bqq19b6m1jm5lp4sqtsd9fam|3
_twilio TXT → twilio-domain-verification=1e0293a7e71ad0e0964265d18ce64b

# Other services (keep)
auth CNAME → otpedpktyvzxkadyabby.supabase.co
recipes CNAME → ghs.googlehosted.com
mealplan CNAME → ghs.googlehosted.com
eat CNAME → ghs.googlehosted.com
blog A → 34.36.91.90
cdn A → 34.95.103.231

# Squarespace internal (keep)
_domainconnect CNAME → _domainconnect.domains.squarespace.com
```

---

## Cost Comparison

### Google Cloud Run (Current)

| Resource | Monthly Cost |
|----------|-------------|
| Cloud Run (choregami service) | ~$15-25 |
| SSL Certificates | Free |
| Egress/Bandwidth | ~$5-10 |
| **Total** | **~$20-35** |

### Fly.io (Target)

| Resource | Monthly Cost |
|----------|-------------|
| Shared CPU (1x, 512MB) | ~$5-7 |
| Bandwidth (included) | Free (100GB) |
| SSL Certificates | Free |
| **Total** | **~$5-10** |

**Estimated Savings**: $15-25/month

---

## Common Issues and Solutions

### Issue: Certificate Stuck in "Awaiting Configuration"

**Cause**: DNS not pointing to Fly.io IPs

**Solution**:
```bash
# Verify DNS is updated
dig choregami.app A +short
# Must return: 66.241.125.185

dig choregami.app AAAA +short
# Must return: 2a09:8280:1::c3:9a68:0
```

### Issue: 502 Bad Gateway

**Cause**: App not running or health check failing

**Solution**:
```bash
fly status -a choregami
fly logs -a choregami
fly apps restart choregami
```

### Issue: Mixed Content / HTTPS Redirect Loop

**Cause**: App not detecting HTTPS correctly behind Fly proxy

**Solution**: Ensure app reads `X-Forwarded-Proto` header for HTTPS detection.

### Issue: OAuth Callback Errors

**Cause**: OAuth redirect URIs need to include the custom domain

**Solution**: Verify OAuth provider settings include:
- `https://choregami.app/auth/callback/google`
- `https://choregami.app/auth/callback/meta`
- `https://choregami.app/auth/callback/apple`

### Issue: OAuth Tokens Landing on Wrong Page

**Cause**: After domain migration, OAuth tokens may land on `/landing` instead of `/login` due to server-side redirect logic.

**Solution**: Ensure `oauth-fragment-handler.js` is included on all pages that might receive OAuth redirects:
- `/login` (original)
- `/register` (original)
- `/landing` (added Feb 3, 2026)

**Implemented Fix**: [OAuth Landing Page Fix](../milestones/20260203_oauth_landing_page_fix.md) adds the handler to `/landing` to process tokens regardless of where Supabase redirects the user.

### Issue: Supabase Ignores redirectTo Parameter

**Cause**: Supabase only respects the `redirectTo` parameter in `signInWithOAuth()` if the URL is in the Redirect URLs allowlist. Without it, Supabase falls back to the Site URL.

**Symptoms**: OAuth works in code but still redirects to `/landing` instead of `/login`.

**Solution**: Add all domain variants to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:

```
https://choregami.app/**
https://www.choregami.app/**
https://choregami.fly.dev/**
http://localhost:8000/
```

**Critical**: The `www.choregami.app/**` wildcard is essential because users may access the app via either `choregami.app` or `www.choregami.app`.

**Implemented**: February 3, 2026 - Added `www.choregami.app/**` to Supabase allowlist.

---

## Migration Status

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| Fly.io App Deployed | Complete | Jan 13, 2026 | https://choregami.fly.dev |
| Fly.io Certificates Added | Complete | Feb 3, 2026 | Let's Encrypt |
| DNS Migration | Complete | Feb 3, 2026 | Squarespace updated |
| SSL Verification | Complete | Feb 3, 2026 | Both certs issued (rsa,ecdsa) |
| Validation Testing | Complete | Feb 3, 2026 | HTTPS working on root, www, /login |
| OAuth Fragment Fix | Complete | Feb 3, 2026 | [See milestone](../milestones/20260203_oauth_landing_page_fix.md) |
| Supabase URL Config | Complete | Feb 3, 2026 | Added `www.choregami.app/**` to redirect allowlist |
| GCP Cleanup | Pending | - | After 24-48 hours of monitoring |

---

## Quick Reference Commands

```bash
# Check Fly.io app status
fly status -a choregami

# Check certificate status
fly certs list -a choregami
fly certs check choregami.app -a choregami

# View logs
fly logs -a choregami

# Check DNS propagation
dig choregami.app A +short
dig choregami.app AAAA +short
dig www.choregami.app CNAME +short

# Test HTTPS
curl -I https://choregami.app
curl -I https://www.choregami.app
```

---

**Author**: Claude Code
**Last Updated**: February 3, 2026

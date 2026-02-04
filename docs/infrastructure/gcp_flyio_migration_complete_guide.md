# Complete Infrastructure Migration Guide: Google Cloud Run to Fly.io

**Document Created**: February 3, 2026
**Status**: Complete
**Author**: Claude Code
**Last Updated**: February 3, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Infrastructure Comparison](#infrastructure-comparison)
3. [Cost Analysis](#cost-analysis)
4. [Google Cloud Resources Inventory](#google-cloud-resources-inventory)
5. [Migration Timeline](#migration-timeline)
6. [Decommissioning Procedure](#decommissioning-procedure)
7. [Reconstruction Guide](#reconstruction-guide)
8. [Scripts Reference](#scripts-reference)
9. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Why We Migrated

ChoreGami migrated from Google Cloud Run to Fly.io for the following reasons:

| Factor | Google Cloud Run | Fly.io | Winner |
|--------|-----------------|--------|--------|
| **Monthly Cost** | $70-110 | $5-10 | Fly.io |
| **Deployment Complexity** | High (multiple components) | Low (single command) | Fly.io |
| **Cold Start Time** | 2-5 seconds | <1 second | Fly.io |
| **Global Edge Deployment** | Regional only | 30+ regions | Fly.io |
| **Deno Native Support** | Container-based | Native Deno runtime | Fly.io |
| **SSL Certificates** | Auto (with domain mapping) | Auto (Let's Encrypt) | Tie |

### Migration Outcome

- **Cost Reduction**: 85-90% (~$780-1,200/year savings)
- **Deployment Time**: Reduced from 5-10 minutes to <2 minutes
- **Performance**: Improved cold start and global latency
- **Complexity**: Eliminated Load Balancer, multiple services, and complex CI/CD

---

## Infrastructure Comparison

### Google Cloud Run Architecture (Legacy)

```
                                    ┌─────────────────────────────────────┐
                                    │      Google Cloud Platform          │
┌──────────┐                        │                                     │
│  User    │                        │  ┌─────────────────────────────┐   │
│ Browser  │─────DNS────────────────┼─▶│   Load Balancer (optional)  │   │
└──────────┘                        │  │   IP: 34.144.236.145        │   │
     │                              │  └──────────────┬──────────────┘   │
     │                              │                 │                   │
     │  OR (direct domain mapping)  │                 ▼                   │
     │                              │  ┌─────────────────────────────┐   │
     └──────────────────────────────┼─▶│   Cloud Run Domain Mapping  │   │
                                    │  │   IPs: 216.239.32/34/36/38  │   │
                                    │  └──────────────┬──────────────┘   │
                                    │                 │                   │
                                    │                 ▼                   │
                                    │  ┌─────────────────────────────┐   │
                                    │  │   Cloud Run Services        │   │
                                    │  │   • choregami (production)  │   │
                                    │  │   • deno-fresh (staging)    │   │
                                    │  └──────────────┬──────────────┘   │
                                    │                 │                   │
                                    │                 ▼                   │
                                    │  ┌─────────────────────────────┐   │
                                    │  │   Supporting Services       │   │
                                    │  │   • Artifact Registry       │   │
                                    │  │   • Secret Manager          │   │
                                    │  │   • Cloud Build             │   │
                                    │  └─────────────────────────────┘   │
                                    └─────────────────────────────────────┘
```

### Fly.io Architecture (Current)

```
                              ┌─────────────────────────────────────┐
                              │           Fly.io Platform           │
┌──────────┐                  │                                     │
│  User    │                  │  ┌─────────────────────────────┐   │
│ Browser  │───DNS───────────▶│  │   Fly Proxy (Edge)          │   │
└──────────┘                  │  │   Anycast IP: 66.241.125.185│   │
                              │  │   IPv6: 2a09:8280:1::...    │   │
                              │  └──────────────┬──────────────┘   │
                              │                 │                   │
                              │                 ▼                   │
                              │  ┌─────────────────────────────┐   │
                              │  │   Fly Machine               │   │
                              │  │   App: choregami            │   │
                              │  │   Region: sjc               │   │
                              │  │   Memory: 512MB             │   │
                              │  └─────────────────────────────┘   │
                              │                                     │
                              └─────────────────────────────────────┘
```

---

## Cost Analysis

### Detailed Monthly Cost Breakdown

#### Google Cloud Run (Legacy)

| Resource | Description | Monthly Cost |
|----------|-------------|-------------|
| **Cloud Run - Production** | `choregami` service, us-central1 | $15-25 |
| **Cloud Run - Staging** | `deno-fresh` service, us-central1 | $10-15 |
| **Load Balancer** | Forwarding rules + data processing | $18-25 |
| **Static IP #1** | 34.144.236.145 (Load Balancer) | $7.30 |
| **Static IP #2** | 34.36.91.90 (Blog/gktech) | $7.30 |
| **Static IP #3** | 34.95.103.231 (CDN) | $7.30 |
| **Artifact Registry** | Container image storage | $3-5 |
| **Cloud Build** | CI/CD builds (~30/month) | $5-10 |
| **Secret Manager** | Secrets storage and access | $1-2 |
| **Egress/Bandwidth** | Data transfer | $5-10 |
| **SSL Certificates** | Google-managed | Free |
| **TOTAL** | | **$79-111/month** |

#### Fly.io (Current)

| Resource | Description | Monthly Cost |
|----------|-------------|-------------|
| **Fly Machine** | shared-cpu-1x, 512MB RAM | $5-7 |
| **Bandwidth** | 100GB included | Free |
| **SSL Certificates** | Let's Encrypt automatic | Free |
| **Persistent Volumes** | None needed | $0 |
| **TOTAL** | | **$5-10/month** |

### Annual Savings Calculation

| Metric | Google Cloud | Fly.io | Savings |
|--------|-------------|--------|---------|
| Monthly Cost | $79-111 | $5-10 | $69-106/mo |
| Annual Cost | $948-1,332 | $60-120 | **$828-1,272/year** |
| Savings % | - | - | **85-91%** |

---

## Google Cloud Resources Inventory

### Resources to DELETE (After Migration Stable)

#### High Priority - Immediate Deletion

| Resource Type | Name | Region | Monthly Cost | Delete Command |
|--------------|------|--------|--------------|----------------|
| Domain Mapping | choregami.app | us-central1 | $0 | `gcloud beta run domain-mappings delete --domain=choregami.app --region=us-central1` |
| Domain Mapping | www.choregami.app | us-central1 | $0 | `gcloud beta run domain-mappings delete --domain=www.choregami.app --region=us-central1` |
| Cloud Run | choregami | us-central1 | $15-25 | `gcloud run services delete choregami --region=us-central1` |
| Cloud Run | deno-fresh | us-central1 | $10-15 | `gcloud run services delete deno-fresh --region=us-central1` |

#### Medium Priority - Load Balancer Components

| Resource Type | Name | Delete Command |
|--------------|------|----------------|
| Forwarding Rule | choregami-https-forwarding-rule | `gcloud compute forwarding-rules delete NAME --global` |
| Forwarding Rule | choregami-http-forwarding-rule | `gcloud compute forwarding-rules delete NAME --global` |
| Target HTTPS Proxy | choregami-https-proxy | `gcloud compute target-https-proxies delete NAME --global` |
| Target HTTP Proxy | choregami-http-proxy | `gcloud compute target-http-proxies delete NAME --global` |
| URL Map | choregami-url-map | `gcloud compute url-maps delete NAME --global` |
| URL Map | choregami-http-redirect | `gcloud compute url-maps delete NAME --global` |
| Backend Service | choregami-backend | `gcloud compute backend-services delete NAME --global` |
| NEG | choregami-neg | `gcloud compute network-endpoint-groups delete NAME --zone=us-central1-a` |
| SSL Certificate | choregami-app-cert-v2 | `gcloud compute ssl-certificates delete NAME --global` |
| Static IP | choregami-lb-ip | `gcloud compute addresses delete NAME --global` |

### Resources to REVIEW Before Deletion

| Resource Type | Name | IP Address | Used By | Action |
|--------------|------|------------|---------|--------|
| Static IP | gktech-ip | 34.36.91.90 | blog.choregami.app | Check if blog still active |
| Static IP | cdn-ip | 34.95.103.231 | cdn.choregami.app | Check if CDN still needed |
| Cloud Run | choregami-recipes | varies | recipes.choregami.app | May serve MealPlanner |
| Cloud Run | choregami-recipes-stg | varies | staging | May serve MealPlanner |

### Resources to KEEP

| Resource Type | Name | Reason |
|--------------|------|--------|
| Secret | geowork_deno_access_token20250530 | Used by Deno KV (cross-platform) |
| Artifact Registry | geowork-containers | May be used by other projects |
| Project | nruka-269205 | Contains other services |

---

## Migration Timeline

### Completed Steps

| Date | Phase | Action | Status |
|------|-------|--------|--------|
| Jan 13, 2026 | Deploy | Fly.io app `choregami` deployed | ✅ |
| Feb 3, 2026 | Certificates | SSL certs added for custom domains | ✅ |
| Feb 3, 2026 | DNS | Squarespace DNS updated to Fly.io IPs | ✅ |
| Feb 3, 2026 | Validation | HTTPS working on root, www, /login | ✅ |
| Feb 3, 2026 | OAuth Fix | Added fragment handler to /landing | ✅ |

### Pending Steps

| Target Date | Phase | Action | Status |
|-------------|-------|--------|--------|
| Feb 5, 2026 | Monitoring | 48-hour stability monitoring | ⏳ |
| Feb 5, 2026 | Cleanup | Run audit script | ⏳ |
| Feb 6, 2026 | Decommission | Delete GCP resources | ⏳ |

---

## Decommissioning Procedure

### Pre-Decommission Checklist

- [ ] Fly.io stable for 24-48 hours
- [ ] All DNS records pointing to Fly.io IPs
- [ ] OAuth working on all providers
- [ ] WebSocket connections functional
- [ ] No error spikes in monitoring
- [ ] Audit script run and reviewed
- [ ] Backup of any needed data

### Decommission Phases

#### Phase 1: Domain Mappings
```bash
./scripts/gcp/decommission_gcp_legacy.sh --dry-run --phase 1
./scripts/gcp/decommission_gcp_legacy.sh --phase 1
```

#### Phase 2: Cloud Run Services
```bash
./scripts/gcp/decommission_gcp_legacy.sh --dry-run --phase 2
./scripts/gcp/decommission_gcp_legacy.sh --phase 2
```

#### Phase 3: Load Balancer Components
```bash
./scripts/gcp/decommission_gcp_legacy.sh --dry-run --phase 3
./scripts/gcp/decommission_gcp_legacy.sh --phase 3
```

#### Phase 4: Static IPs and Cleanup
```bash
./scripts/gcp/decommission_gcp_legacy.sh --dry-run --phase 4
./scripts/gcp/decommission_gcp_legacy.sh --phase 4
```

### Post-Decommission Verification

```bash
# Verify no Cloud Run services remain
gcloud run services list --region=us-central1

# Verify no domain mappings remain
gcloud beta run domain-mappings list --region=us-central1

# Verify static IPs released
gcloud compute addresses list --global

# Verify site still works
curl -I https://choregami.app
curl -I https://www.choregami.app
```

---

## Reconstruction Guide

If you need to migrate back to Google Cloud Run, use the reconstruction script:

```bash
# Preview what will be created
./scripts/gcp/recreate_gcp_infrastructure.sh --dry-run

# Run full reconstruction
./scripts/gcp/recreate_gcp_infrastructure.sh

# Or run specific phases
./scripts/gcp/recreate_gcp_infrastructure.sh --phase 1  # Prerequisites
./scripts/gcp/recreate_gcp_infrastructure.sh --phase 2  # Registry/Secrets
./scripts/gcp/recreate_gcp_infrastructure.sh --phase 3  # Cloud Run deploy
./scripts/gcp/recreate_gcp_infrastructure.sh --phase 4  # Domain mappings
./scripts/gcp/recreate_gcp_infrastructure.sh --phase 5  # Load Balancer (optional)
```

See the [GCP Reconstruction Runbook](./gcp_reconstruction_runbook.md) for detailed step-by-step instructions.

---

## Scripts Reference

### Audit Script

**Location**: `scripts/gcp/audit_gcp_resources.sh`

**Purpose**: Comprehensive inventory of all GCP resources with cost estimates

**Usage**:
```bash
./scripts/gcp/audit_gcp_resources.sh           # Standard output
./scripts/gcp/audit_gcp_resources.sh --json    # JSON format
./scripts/gcp/audit_gcp_resources.sh --output audit.txt  # Save to file
```

### Decommission Script

**Location**: `scripts/gcp/decommission_gcp_legacy.sh`

**Purpose**: Safely remove GCP resources after migration

**Usage**:
```bash
./scripts/gcp/decommission_gcp_legacy.sh --dry-run  # Preview changes
./scripts/gcp/decommission_gcp_legacy.sh            # Run with confirmations
./scripts/gcp/decommission_gcp_legacy.sh --force    # Skip confirmations (DANGER)
./scripts/gcp/decommission_gcp_legacy.sh --phase N  # Run specific phase
```

### Reconstruction Script

**Location**: `scripts/gcp/recreate_gcp_infrastructure.sh`

**Purpose**: Recreate GCP infrastructure if migrating back from Fly.io

**Usage**:
```bash
./scripts/gcp/recreate_gcp_infrastructure.sh --dry-run  # Preview changes
./scripts/gcp/recreate_gcp_infrastructure.sh            # Full setup
./scripts/gcp/recreate_gcp_infrastructure.sh --phase N  # Run specific phase
```

---

## Troubleshooting

### Common Issues After Decommissioning

#### Issue: DNS Still Pointing to Old IPs

**Symptoms**: Site unreachable or showing old content

**Solution**:
```bash
# Check current DNS
dig choregami.app A +short
# Should return: 66.241.125.185

# If still showing Google IPs (216.239.x.x or 34.x.x.x):
# 1. Clear local DNS cache
sudo dscacheutil -flushcache  # macOS
# 2. Wait for TTL to expire (check TTL with dig)
# 3. Verify Squarespace DNS settings
```

#### Issue: OAuth Callback Errors

**Symptoms**: Login fails with callback error

**Solution**:
1. Verify OAuth redirect URIs in provider settings include:
   - `https://choregami.app/auth/callback/google`
   - `https://choregami.app/auth/callback/meta`
   - `https://choregami.app/login`
2. Check that `oauth-fragment-handler.js` is present on redirect pages

#### Issue: Need to Rollback to GCP

**Solution**:
```bash
# 1. Recreate GCP infrastructure
./scripts/gcp/recreate_gcp_infrastructure.sh

# 2. Update DNS to Google IPs (in Squarespace):
#    A records: 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21
#    CNAME www: ghs.googlehosted.com

# 3. Wait for SSL provisioning (5-15 min)

# 4. Remove Fly.io certificates (optional)
fly certs remove choregami.app -a choregami
fly certs remove www.choregami.app -a choregami
```

---

## Appendix: Environment Variables

### Required for GCP Deployment

```bash
# Supabase
SUPABASE_URL=https://otpedpktyvzxkadyabby.supabase.co
SUPABASE_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Deno KV
DENO_KV_URI=https://api.deno.com/databases/<db_id>/connect
DENO_KV_ACCESS_TOKEN=<access_token>

# Stripe (Production)
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# Application
DENO_ENV=production
APP_BASE_URL=https://choregami.app
```

### GCP-Specific Variables

```bash
GCP_PROJECT_ID=nruka-269205
GCP_REGION=us-central1
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Feb 3, 2026 | Claude Code | Initial document creation |

# GCP Reconstruction Runbook

**Document Created**: February 3, 2026
**Purpose**: Step-by-step guide for recreating Google Cloud infrastructure
**Audience**: Developers and AI agents assisting with infrastructure deployment
**Last Updated**: February 3, 2026

---

## Overview

This runbook provides detailed, step-by-step instructions for recreating the Google Cloud infrastructure for ChoreGami. Use this if:

1. You need to migrate back from Fly.io to Google Cloud Run
2. You're setting up a new GCP environment
3. You're recovering from infrastructure loss
4. You want to run a parallel GCP deployment for testing

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Access to project `nruka-269205` (or create new project)
- [ ] DNS access to Squarespace for choregami.app
- [ ] Environment variables file (`.env` or `.env.production`)
- [ ] ChoreGami source code with Dockerfile
- [ ] At least 30 minutes for full setup

---

## Phase 1: Project and API Setup

### Step 1.1: Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set the project
gcloud config set project nruka-269205

# Verify authentication
gcloud auth list
```

**Expected Output**:
```
      ACCOUNT                  STATUS
*     your-email@gmail.com     ACTIVE
```

### Step 1.2: Enable Required APIs

```bash
# Enable all required APIs
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com \
    dns.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled | grep -E "(run|artifact|build|secret|compute|dns)"
```

**Expected Output**: All 6 APIs should be listed.

### Step 1.3: Verify Environment Variables

```bash
# Load environment variables
source .env.production  # or .env

# Verify required variables are set
echo "SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "SUPABASE_KEY: ${SUPABASE_KEY:+(SET)}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+(SET)}"
echo "DENO_KV_ACCESS_TOKEN: ${DENO_KV_ACCESS_TOKEN:+(SET)}"
```

**All variables must show as SET or have values.**

---

## Phase 2: Artifact Registry Setup

### Step 2.1: Create Container Repository

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create geowork-containers \
    --repository-format=docker \
    --location=us-central1 \
    --description="ChoreGami container images"

# Verify creation
gcloud artifacts repositories list --location=us-central1
```

### Step 2.2: Configure Docker Authentication

```bash
# Configure Docker to use Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Verify configuration
cat ~/.docker/config.json | grep "us-central1-docker.pkg.dev"
```

---

## Phase 3: Secret Manager Setup

### Step 3.1: Create Deno KV Secret

```bash
# Create secret for Deno KV access token
echo -n "$DENO_KV_ACCESS_TOKEN" | \
    gcloud secrets create geowork_deno_access_token20250530 \
    --data-file=-

# Verify secret creation
gcloud secrets list
```

### Step 3.2: Grant Cloud Run Access to Secrets

```bash
# Get the compute service account
SERVICE_ACCOUNT="$(gcloud projects describe nruka-269205 --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

# Grant access
gcloud secrets add-iam-policy-binding geowork_deno_access_token20250530 \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

---

## Phase 4: Build and Deploy Cloud Run Services

### Step 4.1: Build Container Image

```bash
# Navigate to project root (must have Dockerfile)
cd /Users/georgekariuki/repos/deno2/chores2026

# Generate image tag
IMAGE_TAG=$(date +%Y%m%d%H%M%S)
IMAGE_PATH="us-central1-docker.pkg.dev/nruka-269205/geowork-containers/choregami:${IMAGE_TAG}"

# Build with Cloud Build
gcloud builds submit \
    --tag="$IMAGE_PATH" \
    --timeout=15m \
    .

# Verify image was pushed
gcloud artifacts docker images list us-central1-docker.pkg.dev/nruka-269205/geowork-containers
```

**Wait for build to complete (2-5 minutes)**

### Step 4.2: Deploy Production Service

```bash
# Deploy to Cloud Run
gcloud run deploy choregami \
    --image="$IMAGE_PATH" \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --concurrency=1000 \
    --timeout=300 \
    --max-instances=10 \
    --set-env-vars="DENO_ENV=production,SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},DENO_KV_URI=${DENO_KV_URI}" \
    --set-secrets="DENO_KV_ACCESS_TOKEN=geowork_deno_access_token20250530:latest"

# Get service URL
SERVICE_URL=$(gcloud run services describe choregami --region=us-central1 --format='value(status.url)')
echo "Production URL: $SERVICE_URL"

# Test the service
curl -I "$SERVICE_URL/api/version"
```

### Step 4.3: Deploy Staging Service

```bash
# Deploy staging service
gcloud run deploy deno-fresh \
    --image="$IMAGE_PATH" \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=3 \
    --set-env-vars="DENO_ENV=staging,SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},DENO_KV_URI=${DENO_KV_URI}" \
    --set-secrets="DENO_KV_ACCESS_TOKEN=geowork_deno_access_token20250530:latest"

# Get staging URL
STAGING_URL=$(gcloud run services describe deno-fresh --region=us-central1 --format='value(status.url)')
echo "Staging URL: $STAGING_URL"
```

---

## Phase 5: Domain Mapping Setup

### Step 5.1: Verify Domain Ownership

```bash
# Verify domain ownership (opens browser)
gcloud domains verify choregami.app

# List verified domains
gcloud domains list-user-verified
```

**Complete the verification process in your browser if prompted.**

### Step 5.2: Update DNS Records in Squarespace

**Login to Squarespace** → **Domains** → **choregami.app** → **DNS Settings**

**DELETE existing records pointing to Fly.io:**
- A record: @ → 66.241.125.185
- AAAA record: @ → 2a09:8280:1::c3:9a68:0
- CNAME: www → dm3x22n.choregami.fly.dev

**ADD Google Cloud Run records:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 216.239.32.21 | 5 min |
| A | @ | 216.239.34.21 | 5 min |
| A | @ | 216.239.36.21 | 5 min |
| A | @ | 216.239.38.21 | 5 min |
| CNAME | www | ghs.googlehosted.com | 5 min |

### Step 5.3: Create Domain Mappings

```bash
# Install beta component if needed
gcloud components install beta --quiet

# Map primary domain
gcloud beta run domain-mappings create \
    --service=choregami \
    --domain=choregami.app \
    --region=us-central1

# Map www subdomain
gcloud beta run domain-mappings create \
    --service=choregami \
    --domain=www.choregami.app \
    --region=us-central1

# Map secondary domain (optional)
gcloud beta run domain-mappings create \
    --service=choregami \
    --domain=choregami.com \
    --region=us-central1

gcloud beta run domain-mappings create \
    --service=choregami \
    --domain=www.choregami.com \
    --region=us-central1
```

### Step 5.4: Monitor SSL Certificate Provisioning

```bash
# Check domain mapping status (repeat every 2-3 minutes)
gcloud beta run domain-mappings describe \
    --domain=choregami.app \
    --region=us-central1

# List all mappings
gcloud beta run domain-mappings list --region=us-central1
```

**SSL provisioning takes 5-15 minutes.** Status should change from `PROVISIONING` to `ACTIVE`.

### Step 5.5: Test Domain Access

```bash
# Wait for DNS propagation (5-15 minutes after updating DNS)
dig choregami.app A +short
# Expected: 216.239.32.21 (or one of the other Google IPs)

# Test HTTPS access
curl -I https://choregami.app
curl -I https://www.choregami.app

# Test application routes
curl -I https://choregami.app/login
curl -I https://choregami.app/api/version
```

---

## Phase 6: Load Balancer Setup (Optional)

**Only needed if you require:**
- Path-based routing (e.g., /recipes → different service)
- URL rewriting
- Advanced traffic management

### Step 6.1: Reserve Static IP

```bash
# Reserve global static IP
gcloud compute addresses create choregami-lb-ip \
    --global \
    --ip-version=IPV4

# Get the IP address
STATIC_IP=$(gcloud compute addresses describe choregami-lb-ip --global --format="value(address)")
echo "Static IP: $STATIC_IP"
```

### Step 6.2: Create Serverless NEG

```bash
# Create Network Endpoint Group for Cloud Run
gcloud compute network-endpoint-groups create choregami-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=choregami
```

### Step 6.3: Create Backend Service

```bash
# Create backend service
gcloud compute backend-services create choregami-backend \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED

# Add NEG to backend
gcloud compute backend-services add-backend choregami-backend \
    --global \
    --network-endpoint-group=choregami-neg \
    --network-endpoint-group-region=us-central1
```

### Step 6.4: Create URL Map

```bash
# Create URL map
gcloud compute url-maps create choregami-url-map \
    --global \
    --default-service=choregami-backend
```

### Step 6.5: Create SSL Certificate

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create choregami-ssl-cert \
    --global \
    --domains=choregami.app,www.choregami.app
```

### Step 6.6: Create HTTPS Proxy and Forwarding Rule

```bash
# Create HTTPS proxy
gcloud compute target-https-proxies create choregami-https-proxy \
    --global \
    --ssl-certificates=choregami-ssl-cert \
    --url-map=choregami-url-map

# Create forwarding rule
gcloud compute forwarding-rules create choregami-https-fwd-rule \
    --global \
    --target-https-proxy=choregami-https-proxy \
    --address=choregami-lb-ip \
    --ports=443
```

### Step 6.7: Create HTTP to HTTPS Redirect

```bash
# Create redirect URL map
cat << EOF | gcloud compute url-maps import choregami-http-redirect --global --source=-
name: choregami-http-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF

# Create HTTP proxy
gcloud compute target-http-proxies create choregami-http-proxy \
    --global \
    --url-map=choregami-http-redirect

# Create HTTP forwarding rule
gcloud compute forwarding-rules create choregami-http-fwd-rule \
    --global \
    --target-http-proxy=choregami-http-proxy \
    --address=choregami-lb-ip \
    --ports=80
```

### Step 6.8: Update DNS to Load Balancer IP

**If using Load Balancer, update DNS in Squarespace:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | [STATIC_IP from Step 6.1] | 5 min |
| A | www | [STATIC_IP from Step 6.1] | 5 min |

**Remove the 4 Google Cloud Run IPs and ghs.googlehosted.com CNAME.**

---

## Phase 7: OAuth Configuration

### Step 7.1: Update OAuth Redirect URIs

Update the following providers with GCP URLs:

**Google Cloud Console** (https://console.cloud.google.com/apis/credentials):
- Add: `https://choregami.app/auth/callback/google`
- Add: `https://choregami.app/login`

**Meta Developer Console** (https://developers.facebook.com):
- Add: `https://choregami.app/auth/callback/meta`

**Apple Developer Console** (if using Apple Sign-In):
- Add: `https://choregami.app/auth/callback/apple`

### Step 7.2: Update Supabase Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://choregami.app`
- Redirect URLs:
  - `https://choregami.app/**`
  - `https://www.choregami.app/**`

---

## Phase 8: Verification Checklist

### Functional Tests

```bash
# Test main pages
curl -I https://choregami.app                    # Landing page
curl -I https://choregami.app/login              # Login page
curl -I https://choregami.app/kid/dashboard      # Kid dashboard
curl -I https://choregami.app/parent/dashboard   # Parent dashboard

# Test API endpoints
curl https://choregami.app/api/version
curl -I https://choregami.app/api/chores/recurring

# Test HTTPS redirect
curl -I http://choregami.app  # Should 301 to HTTPS
```

### SSL Certificate Check

```bash
# Check SSL certificate details
echo | openssl s_client -servername choregami.app -connect choregami.app:443 2>/dev/null | openssl x509 -noout -dates -issuer

# Verify certificate chain
curl -vI https://choregami.app 2>&1 | grep -A5 "SSL certificate"
```

### DNS Verification

```bash
# Verify DNS resolution
dig choregami.app A +short
dig www.choregami.app CNAME +short
dig choregami.app AAAA +short

# Check from multiple resolvers
dig @8.8.8.8 choregami.app A +short
dig @1.1.1.1 choregami.app A +short
```

---

## Rollback Procedure

If the GCP deployment fails and you need to revert to Fly.io:

### Step 1: Update DNS to Fly.io

In Squarespace DNS:

**DELETE Google records:**
- All A records pointing to 216.239.x.x
- CNAME www → ghs.googlehosted.com

**ADD Fly.io records:**
| Type | Host | Value |
|------|------|-------|
| A | @ | 66.241.125.185 |
| AAAA | @ | 2a09:8280:1::c3:9a68:0 |
| CNAME | www | dm3x22n.choregami.fly.dev |

### Step 2: Verify Fly.io is Working

```bash
# Wait for DNS propagation (5-15 minutes)
dig choregami.app A +short
# Expected: 66.241.125.185

# Test site
curl -I https://choregami.app
```

### Step 3: Clean Up GCP Resources (Optional)

```bash
# Delete domain mappings
gcloud beta run domain-mappings delete --domain=choregami.app --region=us-central1 --quiet
gcloud beta run domain-mappings delete --domain=www.choregami.app --region=us-central1 --quiet

# Keep Cloud Run services for future use or delete:
# gcloud run services delete choregami --region=us-central1 --quiet
```

---

## Quick Reference Commands

### Status Checks

```bash
# Cloud Run services
gcloud run services list --region=us-central1

# Domain mappings
gcloud beta run domain-mappings list --region=us-central1

# Static IPs
gcloud compute addresses list --global

# SSL certificates
gcloud compute ssl-certificates list --global
```

### Logs

```bash
# View Cloud Run logs
gcloud run services logs read choregami --region=us-central1 --limit=50

# Stream logs
gcloud run services logs tail choregami --region=us-central1
```

### Deployments

```bash
# Deploy new revision
gcloud run deploy choregami \
    --image=us-central1-docker.pkg.dev/nruka-269205/geowork-containers/choregami:TAG \
    --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic choregami \
    --region=us-central1 \
    --to-revisions=REVISION_NAME=100
```

---

## Troubleshooting

### Issue: Domain Mapping Stuck in Provisioning

**Cause**: DNS not pointing to Google IPs

**Solution**:
1. Verify DNS records are correct
2. Wait for DNS propagation (up to 48 hours in some cases)
3. Try recreating the domain mapping

### Issue: 502 Bad Gateway

**Cause**: Application failing to start

**Solution**:
```bash
# Check logs
gcloud run services logs read choregami --region=us-central1 --limit=100

# Check container health
gcloud run revisions describe REVISION_NAME --region=us-central1
```

### Issue: OAuth Callback Fails

**Cause**: Redirect URI not configured

**Solution**:
1. Add redirect URIs to OAuth providers
2. Verify Supabase redirect URLs
3. Check `oauth-fragment-handler.js` is present on landing pages

### Issue: Cold Start Timeout

**Cause**: Container taking too long to start

**Solution**:
```bash
# Increase timeout
gcloud run services update choregami \
    --region=us-central1 \
    --timeout=600

# Increase memory
gcloud run services update choregami \
    --region=us-central1 \
    --memory=1Gi
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Feb 3, 2026 | Claude Code | Initial runbook creation |

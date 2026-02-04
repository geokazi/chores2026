#!/bin/bash

# =============================================================================
# recreate_gcp_infrastructure.sh
# =============================================================================
# Purpose: Recreate Google Cloud infrastructure for ChoreGami
#          Use this if migrating back from Fly.io to Google Cloud Run
#
# Created: February 3, 2026
# Context: Recovery/reconstruction script for GCP infrastructure
#
# Prerequisites:
#   1. Google Cloud account with billing enabled
#   2. gcloud CLI installed and authenticated
#   3. Domain DNS access (Squarespace for choregami.app)
#   4. Environment variables configured (.env file)
#
# Usage:
#   ./recreate_gcp_infrastructure.sh [--dry-run] [--phase PHASE]
#
# =============================================================================

set -e

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID:-nruka-269205}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
DRY_RUN=false
SPECIFIC_PHASE=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Service names
SERVICE_NAME="choregami"
STAGING_SERVICE_NAME="deno-fresh"
AR_REPO="geowork-containers"

# Domain configuration
PRIMARY_DOMAIN="choregami.app"
WWW_DOMAIN="www.choregami.app"
SECONDARY_DOMAIN="choregami.com"
WWW_SECONDARY_DOMAIN="www.choregami.com"

# Deno KV Configuration
DENO_KV_URI="https://api.deno.com/databases/2094fa5b-af58-4dbe-9fd1-8dc3803a6aac/connect"
DENO_KV_SECRET_NAME="geowork_deno_access_token20250530"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# --- Helper Functions ---
log_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

log_phase() {
    echo ""
    echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BOLD}${CYAN}│  $1${NC}"
    echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

execute_cmd() {
    local cmd="$1"
    local description="$2"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $description"
        echo "  Command: $cmd"
        return 0
    fi

    echo -e "${GREEN}[EXECUTE]${NC} $description"
    if eval "$cmd"; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

confirm_action() {
    local message="$1"
    echo ""
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]]
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --phase)
                SPECIFIC_PHASE="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Recreate Google Cloud infrastructure for ChoreGami.

Options:
  --dry-run       Show what would be created without actually creating
  --phase PHASE   Run specific phase only:
                    1 = Prerequisites and project setup
                    2 = Artifact Registry and Secret Manager
                    3 = Cloud Run services deployment
                    4 = Domain mappings and SSL
                    5 = Load Balancer (optional, for advanced routing)
  --help, -h      Show this help message

Environment Variables Required:
  SUPABASE_URL                 Supabase project URL
  SUPABASE_KEY                 Supabase anon key
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key
  DENO_KV_ACCESS_TOKEN         Deno KV access token
  STRIPE_* variables           Stripe configuration

Examples:
  $0 --dry-run              # Preview all changes
  $0 --phase 3              # Deploy Cloud Run services only
  $0                        # Run full setup
EOF
}

# --- Phase 1: Prerequisites and Project Setup ---
phase1_prerequisites() {
    log_phase "Phase 1: Prerequisites and Project Setup"

    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        echo "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    log_success "gcloud CLI installed"

    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not logged in to gcloud. Run 'gcloud auth login'"
        exit 1
    fi
    log_success "Authenticated with gcloud"

    # Set project
    execute_cmd \
        "gcloud config set project $PROJECT_ID" \
        "Set project to $PROJECT_ID"

    # Enable required APIs
    log_info "Enabling required Google Cloud APIs..."

    local apis=(
        "run.googleapis.com"
        "artifactregistry.googleapis.com"
        "cloudbuild.googleapis.com"
        "secretmanager.googleapis.com"
        "compute.googleapis.com"
        "dns.googleapis.com"
    )

    for api in "${apis[@]}"; do
        execute_cmd \
            "gcloud services enable $api --quiet" \
            "Enable API: $api"
    done

    # Load environment variables
    if [ -f .env ]; then
        log_info "Loading environment variables from .env..."
        set -a
        source .env
        set +a
        log_success "Environment variables loaded"
    elif [ -f .env.production ]; then
        log_info "Loading environment variables from .env.production..."
        set -a
        source .env.production
        set +a
        log_success "Environment variables loaded"
    else
        log_warning "No .env file found - ensure environment variables are set"
    fi

    # Verify required environment variables
    local required_vars=("SUPABASE_URL" "SUPABASE_KEY" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
    log_success "Required environment variables verified"

    log_success "Phase 1 complete - Prerequisites verified"
}

# --- Phase 2: Artifact Registry and Secret Manager ---
phase2_registry_secrets() {
    log_phase "Phase 2: Artifact Registry and Secret Manager"

    # Create Artifact Registry repository
    log_info "Creating Artifact Registry repository..."
    if ! gcloud artifacts repositories describe $AR_REPO --location=$REGION 2>/dev/null; then
        execute_cmd \
            "gcloud artifacts repositories create $AR_REPO \
                --repository-format=docker \
                --location=$REGION \
                --description='ChoreGami container images'" \
            "Create Artifact Registry repository: $AR_REPO"
    else
        log_info "Artifact Registry repository already exists: $AR_REPO"
    fi

    # Configure Docker authentication
    execute_cmd \
        "gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet" \
        "Configure Docker authentication for Artifact Registry"

    # Create or update secrets in Secret Manager
    log_info "Setting up Secret Manager secrets..."

    # Deno KV Access Token
    if ! gcloud secrets describe $DENO_KV_SECRET_NAME 2>/dev/null; then
        if [ -n "$DENO_KV_ACCESS_TOKEN" ]; then
            execute_cmd \
                "echo -n '$DENO_KV_ACCESS_TOKEN' | gcloud secrets create $DENO_KV_SECRET_NAME --data-file=-" \
                "Create secret: $DENO_KV_SECRET_NAME"
        else
            log_warning "DENO_KV_ACCESS_TOKEN not set - skipping secret creation"
        fi
    else
        log_info "Secret already exists: $DENO_KV_SECRET_NAME"
    fi

    # Grant Cloud Run access to secrets
    local service_account="${PROJECT_ID}@appspot.gserviceaccount.com"
    execute_cmd \
        "gcloud secrets add-iam-policy-binding $DENO_KV_SECRET_NAME \
            --member='serviceAccount:${PROJECT_ID}-compute@developer.gserviceaccount.com' \
            --role='roles/secretmanager.secretAccessor' --quiet 2>/dev/null || true" \
        "Grant Secret Manager access to Cloud Run"

    log_success "Phase 2 complete - Registry and secrets configured"
}

# --- Phase 3: Cloud Run Services Deployment ---
phase3_cloud_run_deployment() {
    log_phase "Phase 3: Cloud Run Services Deployment"

    # Generate deployment version
    local DEPLOYMENT_VERSION=$(date +%Y-%m-%dT%H-%M)
    local DENO_DEPLOYMENT_ID=$(git rev-parse HEAD 2>/dev/null || echo "deploy-${DEPLOYMENT_VERSION}")
    local IMAGE_TAG=$(date +%Y%m%d%H%M%S)
    local IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:${IMAGE_TAG}"

    log_info "Deployment version: $DEPLOYMENT_VERSION"
    log_info "Image path: $IMAGE_PATH"

    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found in current directory"
        log_info "Please ensure you're in the ChoreGami project root"
        exit 1
    fi

    # Build container image using Cloud Build
    log_info "Building container image with Cloud Build..."

    # Create temporary cloudbuild.yaml
    cat > /tmp/cloudbuild-choregami.yaml << EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '--build-arg', 'SUPABASE_URL=${SUPABASE_URL}',
      '--build-arg', 'SUPABASE_KEY=${SUPABASE_KEY}',
      '--build-arg', 'SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}',
      '--build-arg', 'DENO_KV_URI=${DENO_KV_URI}',
      '--build-arg', 'DEPLOYMENT_VERSION=${IMAGE_TAG}',
      '-t', '${IMAGE_PATH}',
      '.'
    ]
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${IMAGE_PATH}']
options:
  logging: CLOUD_LOGGING_ONLY
EOF

    execute_cmd \
        "gcloud builds submit --config /tmp/cloudbuild-choregami.yaml . --quiet" \
        "Build and push container image"

    # Deploy to Cloud Run (Production)
    log_info "Deploying to Cloud Run (Production)..."

    execute_cmd \
        "gcloud run deploy $SERVICE_NAME \
            --image=$IMAGE_PATH \
            --platform=managed \
            --region=$REGION \
            --allow-unauthenticated \
            --port=8080 \
            --memory=512Mi \
            --cpu=1 \
            --concurrency=1000 \
            --timeout=300 \
            --max-instances=10 \
            --set-env-vars='DENO_ENV=production,DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION},DENO_DEPLOYMENT_ID=${DENO_DEPLOYMENT_ID},SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},DENO_KV_URI=${DENO_KV_URI}' \
            --set-secrets='DENO_KV_ACCESS_TOKEN=${DENO_KV_SECRET_NAME}:latest' \
            --quiet" \
        "Deploy Cloud Run service: $SERVICE_NAME"

    # Deploy staging service
    log_info "Deploying staging service..."

    execute_cmd \
        "gcloud run deploy $STAGING_SERVICE_NAME \
            --image=$IMAGE_PATH \
            --platform=managed \
            --region=$REGION \
            --allow-unauthenticated \
            --port=8080 \
            --memory=512Mi \
            --cpu=1 \
            --timeout=300 \
            --max-instances=3 \
            --set-env-vars='DENO_ENV=staging,DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION},SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},DENO_KV_URI=${DENO_KV_URI}' \
            --set-secrets='DENO_KV_ACCESS_TOKEN=${DENO_KV_SECRET_NAME}:latest' \
            --quiet" \
        "Deploy Cloud Run staging service: $STAGING_SERVICE_NAME"

    # Get service URL
    local SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    log_success "Production service deployed: $SERVICE_URL"

    local STAGING_URL=$(gcloud run services describe $STAGING_SERVICE_NAME --region=$REGION --format='value(status.url)')
    log_success "Staging service deployed: $STAGING_URL"

    # Cleanup
    rm -f /tmp/cloudbuild-choregami.yaml

    log_success "Phase 3 complete - Cloud Run services deployed"
}

# --- Phase 4: Domain Mappings and SSL ---
phase4_domain_mappings() {
    log_phase "Phase 4: Domain Mappings and SSL"

    log_info "This phase maps custom domains to Cloud Run services"
    log_warning "DNS must be configured to point to Google Cloud Run IPs:"
    echo ""
    echo "  A Records for apex domain (@):"
    echo "    216.239.32.21"
    echo "    216.239.34.21"
    echo "    216.239.36.21"
    echo "    216.239.38.21"
    echo ""
    echo "  CNAME Record for www:"
    echo "    ghs.googlehosted.com"
    echo ""

    if ! confirm_action "Have you configured DNS records as shown above?"; then
        log_warning "Skipping domain mappings - configure DNS first"
        return 0
    fi

    # Verify domain ownership
    log_info "Verifying domain ownership..."
    execute_cmd \
        "gcloud domains verify $PRIMARY_DOMAIN 2>/dev/null || true" \
        "Verify domain: $PRIMARY_DOMAIN"

    # Install beta components
    execute_cmd \
        "gcloud components install beta --quiet 2>/dev/null || true" \
        "Install gcloud beta components"

    # Create domain mappings
    local domains=("$PRIMARY_DOMAIN" "$WWW_DOMAIN" "$SECONDARY_DOMAIN" "$WWW_SECONDARY_DOMAIN")

    for domain in "${domains[@]}"; do
        log_info "Creating domain mapping: $domain"

        # Check if mapping already exists
        if gcloud beta run domain-mappings describe --domain=$domain --region=$REGION 2>/dev/null; then
            log_info "Domain mapping already exists: $domain"
        else
            execute_cmd \
                "gcloud beta run domain-mappings create \
                    --service=$SERVICE_NAME \
                    --domain=$domain \
                    --region=$REGION" \
                "Create domain mapping: $domain"
        fi
    done

    # Check SSL certificate status
    log_info "Checking SSL certificate status (may take 5-15 minutes)..."
    for domain in "${domains[@]}"; do
        local status=$(gcloud beta run domain-mappings describe \
            --domain=$domain \
            --region=$REGION \
            --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")
        echo "  $domain: $status"
    done

    log_success "Phase 4 complete - Domain mappings created"
    log_info "SSL certificates will be automatically provisioned"
    log_info "Monitor status with: gcloud beta run domain-mappings list --region=$REGION"
}

# --- Phase 5: Load Balancer Setup (Optional) ---
phase5_load_balancer() {
    log_phase "Phase 5: Load Balancer Setup (Optional)"

    log_info "Load Balancer provides advanced routing capabilities"
    log_info "Only needed if you require:"
    log_info "  - Path-based routing to multiple services"
    log_info "  - URL rewriting"
    log_info "  - Advanced traffic management"
    echo ""

    if ! confirm_action "Do you need Load Balancer setup?"; then
        log_info "Skipping Load Balancer setup"
        return 0
    fi

    # Reserve static IP
    log_info "Reserving global static IP address..."
    local IP_NAME="choregami-lb-ip"

    if ! gcloud compute addresses describe $IP_NAME --global 2>/dev/null; then
        execute_cmd \
            "gcloud compute addresses create $IP_NAME --global --ip-version=IPV4" \
            "Reserve static IP: $IP_NAME"
    fi

    local STATIC_IP=$(gcloud compute addresses describe $IP_NAME --global --format="value(address)")
    log_success "Static IP: $STATIC_IP"

    # Create Network Endpoint Group
    log_info "Creating Network Endpoint Group..."
    local NEG_NAME="choregami-neg"

    execute_cmd \
        "gcloud compute network-endpoint-groups create $NEG_NAME \
            --region=$REGION \
            --network-endpoint-type=serverless \
            --cloud-run-service=$SERVICE_NAME" \
        "Create NEG: $NEG_NAME"

    # Create backend service
    log_info "Creating backend service..."
    local BACKEND_NAME="choregami-backend"

    execute_cmd \
        "gcloud compute backend-services create $BACKEND_NAME \
            --global \
            --load-balancing-scheme=EXTERNAL_MANAGED" \
        "Create backend service: $BACKEND_NAME"

    execute_cmd \
        "gcloud compute backend-services add-backend $BACKEND_NAME \
            --global \
            --network-endpoint-group=$NEG_NAME \
            --network-endpoint-group-region=$REGION" \
        "Add NEG to backend service"

    # Create URL map
    log_info "Creating URL map..."
    local URL_MAP_NAME="choregami-url-map"

    execute_cmd \
        "gcloud compute url-maps create $URL_MAP_NAME \
            --global \
            --default-service=$BACKEND_NAME" \
        "Create URL map: $URL_MAP_NAME"

    # Create SSL certificate
    log_info "Creating managed SSL certificate..."
    local CERT_NAME="choregami-ssl-cert"

    execute_cmd \
        "gcloud compute ssl-certificates create $CERT_NAME \
            --global \
            --domains=$PRIMARY_DOMAIN,$WWW_DOMAIN" \
        "Create SSL certificate: $CERT_NAME"

    # Create HTTPS proxy
    log_info "Creating HTTPS proxy..."
    local HTTPS_PROXY_NAME="choregami-https-proxy"

    execute_cmd \
        "gcloud compute target-https-proxies create $HTTPS_PROXY_NAME \
            --global \
            --ssl-certificates=$CERT_NAME \
            --url-map=$URL_MAP_NAME" \
        "Create HTTPS proxy: $HTTPS_PROXY_NAME"

    # Create forwarding rule
    log_info "Creating forwarding rule..."
    local FWD_RULE_NAME="choregami-https-fwd-rule"

    execute_cmd \
        "gcloud compute forwarding-rules create $FWD_RULE_NAME \
            --global \
            --target-https-proxy=$HTTPS_PROXY_NAME \
            --address=$IP_NAME \
            --ports=443" \
        "Create forwarding rule: $FWD_RULE_NAME"

    # Create HTTP redirect
    log_info "Setting up HTTP to HTTPS redirect..."
    local HTTP_URL_MAP="choregami-http-redirect"
    local HTTP_PROXY="choregami-http-proxy"
    local HTTP_FWD_RULE="choregami-http-fwd-rule"

    execute_cmd \
        "gcloud compute url-maps import $HTTP_URL_MAP --global --source=/dev/stdin << EOF
name: $HTTP_URL_MAP
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF" \
        "Create HTTP redirect URL map"

    execute_cmd \
        "gcloud compute target-http-proxies create $HTTP_PROXY \
            --global \
            --url-map=$HTTP_URL_MAP" \
        "Create HTTP proxy"

    execute_cmd \
        "gcloud compute forwarding-rules create $HTTP_FWD_RULE \
            --global \
            --target-http-proxy=$HTTP_PROXY \
            --address=$IP_NAME \
            --ports=80" \
        "Create HTTP forwarding rule"

    echo ""
    log_success "Phase 5 complete - Load Balancer configured"
    echo ""
    log_warning "Update DNS to point to Load Balancer IP: $STATIC_IP"
    echo "  A Record: @ → $STATIC_IP"
    echo "  A Record: www → $STATIC_IP"
}

# --- Summary ---
generate_summary() {
    log_header "Reconstruction Summary"

    echo ""
    echo "Google Cloud infrastructure has been recreated:"
    echo ""

    # Get service URLs
    local prod_url=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null || echo "N/A")
    local staging_url=$(gcloud run services describe $STAGING_SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null || echo "N/A")

    echo "Cloud Run Services:"
    echo "  Production: $prod_url"
    echo "  Staging: $staging_url"
    echo ""

    echo "Custom Domains (after DNS propagation):"
    echo "  https://$PRIMARY_DOMAIN"
    echo "  https://$WWW_DOMAIN"
    echo ""

    echo "Next Steps:"
    echo "  1. Update DNS records in Squarespace"
    echo "  2. Wait for SSL certificate provisioning (5-15 min)"
    echo "  3. Test all endpoints"
    echo "  4. Update OAuth redirect URIs if needed"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_warning "This was a DRY RUN - no changes were made"
    fi
}

# --- Main Execution ---
main() {
    parse_args "$@"

    log_header "GCP Infrastructure Reconstruction"
    echo ""
    echo "Project: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Timestamp: $(date)"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi

    if [ -z "$SPECIFIC_PHASE" ]; then
        phase1_prerequisites
        phase2_registry_secrets
        phase3_cloud_run_deployment
        phase4_domain_mappings
        # Phase 5 is optional and always prompts
        phase5_load_balancer
    else
        case "$SPECIFIC_PHASE" in
            1) phase1_prerequisites ;;
            2) phase2_registry_secrets ;;
            3) phase3_cloud_run_deployment ;;
            4) phase4_domain_mappings ;;
            5) phase5_load_balancer ;;
            *)
                log_error "Invalid phase: $SPECIFIC_PHASE (must be 1-5)"
                exit 1
                ;;
        esac
    fi

    generate_summary
}

# Run main function
main "$@"

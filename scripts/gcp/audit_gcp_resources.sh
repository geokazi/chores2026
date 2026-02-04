#!/bin/bash

# =============================================================================
# audit_gcp_resources.sh
# =============================================================================
# Purpose: Comprehensive audit of all Google Cloud resources related to
#          ChoreGami infrastructure before decommissioning
#
# Created: February 3, 2026
# Context: Migration from Google Cloud Run to Fly.io
#
# Usage:
#   ./audit_gcp_resources.sh [--json] [--output FILE]
#
# Options:
#   --json          Output results in JSON format
#   --output FILE   Save results to specified file
#   --help          Show this help message
#
# =============================================================================

set -e

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID:-nruka-269205}"
REGION="${GCP_REGION:-us-central1}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FORMAT="text"
OUTPUT_FILE=""

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

log_section() {
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
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

log_cost() {
    echo -e "${YELLOW}💰 $1${NC}"
}

log_resource() {
    echo -e "   ${GREEN}►${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --json)
                OUTPUT_FORMAT="json"
                shift
                ;;
            --output)
                OUTPUT_FILE="$2"
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
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Audit Google Cloud resources for ChoreGami infrastructure"
    echo ""
    echo "Options:"
    echo "  --json          Output results in JSON format"
    echo "  --output FILE   Save results to specified file"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  GCP_PROJECT_ID  Google Cloud Project ID (default: nruka-269205)"
    echo "  GCP_REGION      Default region (default: us-central1)"
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"

    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        exit 1
    fi
    log_success "gcloud CLI installed"

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not logged in to gcloud. Run 'gcloud auth login'"
        exit 1
    fi
    log_success "Authenticated with gcloud"

    # Set project
    gcloud config set project $PROJECT_ID --quiet
    log_success "Project set to: $PROJECT_ID"
}

# --- Audit Functions ---

audit_cloud_run_services() {
    log_section "Cloud Run Services"

    local services=$(gcloud run services list --region=$REGION --format="table(name,region,status.url)" 2>/dev/null || echo "")

    if [ -z "$services" ]; then
        log_info "No Cloud Run services found in $REGION"
    else
        echo "$services"
        echo ""

        # Get detailed info for each service
        for service in $(gcloud run services list --region=$REGION --format="value(name)" 2>/dev/null); do
            log_resource "Service: $service"

            # Get revision count
            local revision_count=$(gcloud run revisions list --service=$service --region=$REGION --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
            echo "      Revisions: $revision_count"

            # Get latest revision
            local latest=$(gcloud run services describe $service --region=$REGION --format="value(status.latestReadyRevisionName)" 2>/dev/null)
            echo "      Latest: $latest"

            # Get traffic allocation
            local traffic=$(gcloud run services describe $service --region=$REGION --format="value(status.traffic[0].percent)" 2>/dev/null)
            echo "      Traffic: ${traffic}%"

            # Estimate cost (rough)
            log_cost "Estimated cost: ~\$15-25/month (varies with usage)"
        done
    fi
}

audit_cloud_run_domain_mappings() {
    log_section "Cloud Run Domain Mappings"

    local mappings=$(gcloud beta run domain-mappings list --region=$REGION --format="table(metadata.name,spec.routeName,status.resourceRecords[0].type,status.resourceRecords[0].rrdata)" 2>/dev/null || echo "")

    if [ -z "$mappings" ] || [ "$mappings" = "Listed 0 items." ]; then
        log_info "No domain mappings found in $REGION"
    else
        echo "$mappings"
        log_cost "Domain mappings: Free (but require Cloud Run service)"
    fi
}

audit_static_ips() {
    log_section "Static IP Addresses"

    echo ""
    echo "Global Static IPs:"
    local global_ips=$(gcloud compute addresses list --global --format="table(name,address,status,addressType)" 2>/dev/null || echo "")

    if [ -z "$global_ips" ]; then
        log_info "No global static IPs found"
    else
        echo "$global_ips"

        # Count and calculate cost
        local ip_count=$(gcloud compute addresses list --global --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$ip_count" -gt 0 ]; then
            local monthly_cost=$(echo "$ip_count * 7.30" | bc 2>/dev/null || echo "$ip_count x \$7.30")
            log_cost "Static IPs ($ip_count): ~\$${monthly_cost}/month (\$0.01/hour each)"
        fi
    fi

    echo ""
    echo "Regional Static IPs ($REGION):"
    local regional_ips=$(gcloud compute addresses list --regions=$REGION --format="table(name,address,status,addressType)" 2>/dev/null || echo "")

    if [ -z "$regional_ips" ]; then
        log_info "No regional static IPs found in $REGION"
    else
        echo "$regional_ips"
    fi
}

audit_load_balancers() {
    log_section "Load Balancer Components"

    echo ""
    echo "Forwarding Rules (Frontend):"
    gcloud compute forwarding-rules list --global --format="table(name,IPAddress,target,portRange)" 2>/dev/null || log_info "No global forwarding rules"

    echo ""
    echo "Target HTTPS Proxies:"
    gcloud compute target-https-proxies list --global --format="table(name,sslCertificates,urlMap)" 2>/dev/null || log_info "No HTTPS proxies"

    echo ""
    echo "Target HTTP Proxies:"
    gcloud compute target-http-proxies list --global --format="table(name,urlMap)" 2>/dev/null || log_info "No HTTP proxies"

    echo ""
    echo "URL Maps:"
    gcloud compute url-maps list --global --format="table(name,defaultService)" 2>/dev/null || log_info "No URL maps"

    echo ""
    echo "Backend Services:"
    gcloud compute backend-services list --global --format="table(name,backends[0].group,protocol)" 2>/dev/null || log_info "No backend services"

    echo ""
    echo "Network Endpoint Groups (NEGs):"
    gcloud compute network-endpoint-groups list --format="table(name,zone,networkEndpointType)" 2>/dev/null || log_info "No NEGs"

    log_cost "Load Balancer: ~\$18-25/month (forwarding rules + data processing)"
}

audit_ssl_certificates() {
    log_section "SSL Certificates"

    echo ""
    echo "Google-Managed SSL Certificates:"
    gcloud compute ssl-certificates list --global --format="table(name,type,managed.domains,managed.status)" 2>/dev/null || log_info "No SSL certificates"

    log_cost "SSL Certificates: Free (Google-managed)"
}

audit_artifact_registry() {
    log_section "Artifact Registry"

    echo ""
    echo "Repositories:"
    gcloud artifacts repositories list --format="table(name,format,location,sizeBytes)" 2>/dev/null || log_info "No artifact repositories"

    # Check for container images
    echo ""
    echo "Container Images (geowork-containers):"
    local images=$(gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/geowork-containers --format="table(package,version,createTime)" --limit=10 2>/dev/null || echo "")

    if [ -z "$images" ]; then
        log_info "No container images found or repository doesn't exist"
    else
        echo "$images"

        # Get total image count
        local image_count=$(gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/geowork-containers --format="value(package)" 2>/dev/null | wc -l | tr -d ' ')
        log_info "Total images: $image_count"
    fi

    log_cost "Artifact Registry: ~\$3-5/month (depends on storage)"
}

audit_secret_manager() {
    log_section "Secret Manager"

    echo ""
    echo "Secrets:"
    gcloud secrets list --format="table(name,createTime,replication.automatic)" 2>/dev/null || log_info "No secrets found"

    # Look for specific secrets
    echo ""
    echo "ChoreGami-related secrets:"
    for secret in "geowork_deno_access_token20250530" "deno-kv-token" "stripe" "supabase"; do
        if gcloud secrets describe "$secret" --format="value(name)" 2>/dev/null; then
            log_resource "Found: $secret"
        fi
    done

    log_cost "Secret Manager: ~\$1-2/month (per secret version access)"
}

audit_cloud_build() {
    log_section "Cloud Build"

    echo ""
    echo "Recent Builds (last 10):"
    gcloud builds list --limit=10 --format="table(id,status,createTime,source.repoSource.repoName)" 2>/dev/null || log_info "No builds found"

    echo ""
    echo "Build Triggers:"
    gcloud builds triggers list --format="table(name,createTime,github.name)" 2>/dev/null || log_info "No build triggers"

    log_cost "Cloud Build: ~\$5-10/month (120 free minutes/day)"
}

audit_dns_records() {
    log_section "DNS Configuration (External Check)"

    echo ""
    echo "Checking DNS for key domains..."

    local domains=("choregami.app" "www.choregami.app" "choregami.com" "www.choregami.com" "blog.choregami.app" "cdn.choregami.app" "recipes.choregami.app" "mealplan.choregami.app" "eat.choregami.app")

    for domain in "${domains[@]}"; do
        echo ""
        echo "Domain: $domain"
        local a_record=$(dig +short $domain A 2>/dev/null | head -1)
        local cname_record=$(dig +short $domain CNAME 2>/dev/null | head -1)

        if [ -n "$a_record" ]; then
            echo "  A Record: $a_record"

            # Check if it's a Google IP
            if [[ "$a_record" == 216.239.* ]]; then
                log_warning "  → Points to Google Cloud Run domain mapping IPs"
            elif [[ "$a_record" == 34.* ]]; then
                log_warning "  → Points to Google Cloud Load Balancer or Compute"
            elif [[ "$a_record" == 66.241.* ]]; then
                log_success "  → Points to Fly.io"
            fi
        elif [ -n "$cname_record" ]; then
            echo "  CNAME: $cname_record"

            if [[ "$cname_record" == *"fly.dev"* ]]; then
                log_success "  → Points to Fly.io"
            elif [[ "$cname_record" == *"googlehosted.com"* ]]; then
                log_warning "  → Points to Google hosted services"
            fi
        else
            log_info "  No A or CNAME record found"
        fi
    done
}

audit_billing_estimate() {
    log_section "Monthly Cost Estimate Summary"

    echo ""
    echo "┌─────────────────────────────────────┬──────────────────┬─────────────┐"
    echo "│ Resource                            │ Estimated Cost   │ Status      │"
    echo "├─────────────────────────────────────┼──────────────────┼─────────────┤"

    # Cloud Run
    local cr_count=$(gcloud run services list --region=$REGION --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    printf "│ %-35s │ %-16s │ %-11s │\n" "Cloud Run Services ($cr_count)" "~\$${cr_count}5-40/mo" "REVIEW"

    # Static IPs
    local ip_count=$(gcloud compute addresses list --global --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local ip_cost=$(echo "$ip_count * 7.30" | bc 2>/dev/null || echo "~\$22")
    printf "│ %-35s │ %-16s │ %-11s │\n" "Static IPs ($ip_count)" "~\$${ip_cost}/mo" "DELETE"

    # Load Balancer
    local lb_count=$(gcloud compute forwarding-rules list --global --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$lb_count" -gt 0 ]; then
        printf "│ %-35s │ %-16s │ %-11s │\n" "Load Balancer" "~\$18-25/mo" "DELETE"
    fi

    # Artifact Registry
    printf "│ %-35s │ %-16s │ %-11s │\n" "Artifact Registry" "~\$3-5/mo" "CLEANUP"

    # Secret Manager
    printf "│ %-35s │ %-16s │ %-11s │\n" "Secret Manager" "~\$1-2/mo" "KEEP"

    # Cloud Build
    printf "│ %-35s │ %-16s │ %-11s │\n" "Cloud Build" "~\$5-10/mo" "STOP"

    echo "├─────────────────────────────────────┼──────────────────┼─────────────┤"
    printf "│ %-35s │ %-16s │ %-11s │\n" "TOTAL ESTIMATED" "~\$70-110/mo" ""
    echo "└─────────────────────────────────────┴──────────────────┴─────────────┘"

    echo ""
    log_info "After migration to Fly.io: ~\$5-10/month"
    log_success "Potential Annual Savings: ~\$720-1,200/year"
}

generate_decommission_recommendations() {
    log_section "Decommission Recommendations"

    echo ""
    echo "Based on the audit, here are the recommended actions:"
    echo ""

    echo "🔴 HIGH PRIORITY (Delete Immediately After Fly.io Stable):"
    echo "   1. Cloud Run domain mappings for choregami.app"
    echo "   2. Cloud Run 'choregami' service"
    echo "   3. Cloud Run 'deno-fresh' service (staging)"
    echo "   4. Load Balancer components (forwarding rules, proxies, URL maps)"
    echo "   5. Static IP: 34.144.236.145 (load balancer IP)"
    echo ""

    echo "🟡 MEDIUM PRIORITY (Review Before Deleting):"
    echo "   1. Static IP: 34.36.91.90 (blog infrastructure)"
    echo "   2. Static IP: 34.95.103.231 (CDN)"
    echo "   3. Old container images in Artifact Registry"
    echo "   4. SSL certificates (will be auto-deleted with LB)"
    echo ""

    echo "🟢 LOW PRIORITY (Keep or Gradual Cleanup):"
    echo "   1. Secret Manager secrets (still used by Deno KV)"
    echo "   2. Artifact Registry repository (might need for other projects)"
    echo "   3. Cloud Build history (informational)"
    echo ""

    echo "📋 Run decommission script:"
    echo "   ./scripts/gcp/decommission_gcp_legacy.sh"
}

# --- Main Execution ---
main() {
    parse_args "$@"

    log_header "GCP Resource Audit for ChoreGami"
    echo ""
    echo "Project: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Timestamp: $(date)"
    echo ""

    check_prerequisites

    audit_cloud_run_services
    audit_cloud_run_domain_mappings
    audit_static_ips
    audit_load_balancers
    audit_ssl_certificates
    audit_artifact_registry
    audit_secret_manager
    audit_cloud_build
    audit_dns_records
    audit_billing_estimate
    generate_decommission_recommendations

    log_header "Audit Complete"
    echo ""
    echo "Audit completed at: $(date)"
    echo "Results saved to: ${OUTPUT_FILE:-stdout}"

    if [ -n "$OUTPUT_FILE" ]; then
        echo "Run this script again with --output to save results to a file"
    fi
}

# Run main function
main "$@"

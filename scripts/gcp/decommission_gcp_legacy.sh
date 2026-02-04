#!/bin/bash

# =============================================================================
# decommission_gcp_legacy.sh
# =============================================================================
# Purpose: Safely decommission Google Cloud infrastructure after migration
#          to Fly.io for ChoreGami
#
# Created: February 3, 2026
# Context: Migration from Google Cloud Run to Fly.io
#
# IMPORTANT: Only run this script AFTER:
#   1. Fly.io deployment is stable for 24-48 hours
#   2. DNS has propagated and all traffic is on Fly.io
#   3. You have run audit_gcp_resources.sh and reviewed the output
#   4. You have tested all critical paths on Fly.io
#
# Usage:
#   ./decommission_gcp_legacy.sh [--dry-run] [--phase PHASE] [--force]
#
# Options:
#   --dry-run       Show what would be deleted without actually deleting
#   --phase PHASE   Run specific phase (1-4) instead of all phases
#   --force         Skip confirmation prompts (DANGEROUS)
#   --help          Show this help message
#
# =============================================================================

set -e

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID:-nruka-269205}"
REGION="${GCP_REGION:-us-central1}"
DRY_RUN=false
FORCE=false
SPECIFIC_PHASE=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="decommission_log_${TIMESTAMP}.txt"

# Known resources to decommission
CLOUD_RUN_SERVICES=("choregami" "deno-fresh")
DOMAIN_MAPPINGS=("choregami.app" "www.choregami.app" "choregami.com" "www.choregami.com")
LOAD_BALANCER_IP="34.144.236.145"
BLOG_IP="34.36.91.90"
CDN_IP="34.95.103.231"

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
    local msg="$1"
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $msg${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_phase() {
    local msg="$1"
    echo ""
    echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BOLD}${CYAN}│  $msg${NC}"
    echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo "PHASE: $msg" >> "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "INFO: $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "SUCCESS: $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "WARNING: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "ERROR: $1" >> "$LOG_FILE"
}

log_action() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $1"
        echo "DRY-RUN: $1" >> "$LOG_FILE"
    else
        echo -e "${GREEN}[EXECUTE]${NC} $1"
        echo "EXECUTE: $1" >> "$LOG_FILE"
    fi
}

confirm_action() {
    local message="$1"
    if [ "$FORCE" = true ]; then
        return 0
    fi

    echo ""
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Skipped by user"
        return 1
    fi
    return 0
}

execute_cmd() {
    local cmd="$1"
    local description="$2"

    log_action "$description"

    if [ "$DRY_RUN" = true ]; then
        echo "  Command: $cmd"
        return 0
    fi

    if eval "$cmd"; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
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

Safely decommission Google Cloud infrastructure after Fly.io migration.

Options:
  --dry-run       Show what would be deleted without actually deleting
  --phase PHASE   Run specific phase only:
                    1 = Domain mappings
                    2 = Cloud Run services
                    3 = Load Balancer components
                    4 = Static IPs and cleanup
  --force         Skip confirmation prompts (DANGEROUS)
  --help, -h      Show this help message

Environment Variables:
  GCP_PROJECT_ID  Google Cloud Project ID (default: nruka-269205)
  GCP_REGION      Default region (default: us-central1)

IMPORTANT: Always run with --dry-run first to review changes!

Examples:
  $0 --dry-run              # Preview all changes
  $0 --dry-run --phase 1    # Preview phase 1 only
  $0 --phase 1              # Run phase 1 with confirmations
  $0 --force                # Run all phases without confirmations (DANGEROUS)
EOF
}

# --- Pre-flight Checks ---
preflight_checks() {
    log_header "Pre-flight Checks"

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
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
    gcloud config set project $PROJECT_ID --quiet
    log_success "Project set to: $PROJECT_ID"

    # Verify Fly.io is serving traffic
    log_info "Verifying Fly.io is serving traffic..."
    local fly_ip=$(dig +short choregami.app A 2>/dev/null | head -1)

    if [[ "$fly_ip" == "66.241.125.185" ]]; then
        log_success "DNS confirmed pointing to Fly.io (66.241.125.185)"
    else
        log_warning "DNS may not be pointing to Fly.io yet"
        log_warning "Current IP: $fly_ip"
        log_warning "Expected: 66.241.125.185"

        if ! confirm_action "DNS is not pointing to Fly.io. Continue anyway?"; then
            log_error "Aborting - DNS not migrated"
            exit 1
        fi
    fi

    # Test Fly.io is responding
    if curl -sf --max-time 10 "https://choregami.app/api/version" > /dev/null 2>&1; then
        log_success "Fly.io is responding to requests"
    else
        log_warning "Could not verify Fly.io is responding"
        if ! confirm_action "Could not verify Fly.io. Continue anyway?"; then
            exit 1
        fi
    fi

    if [ "$DRY_RUN" = true ]; then
        echo ""
        log_warning "DRY-RUN MODE - No changes will be made"
    fi
}

# --- Phase 1: Domain Mappings ---
phase1_domain_mappings() {
    log_phase "Phase 1: Remove Cloud Run Domain Mappings"

    log_info "Domain mappings prevent Cloud Run service deletion"
    log_info "These must be removed first"

    for domain in "${DOMAIN_MAPPINGS[@]}"; do
        # Check if mapping exists
        if gcloud beta run domain-mappings describe --domain="$domain" --region=$REGION 2>/dev/null; then
            execute_cmd \
                "gcloud beta run domain-mappings delete --domain=$domain --region=$REGION --project=$PROJECT_ID --quiet" \
                "Delete domain mapping: $domain"
        else
            log_info "Domain mapping not found: $domain (may already be deleted)"
        fi
    done

    log_success "Phase 1 complete - Domain mappings removed"
}

# --- Phase 2: Cloud Run Services ---
phase2_cloud_run_services() {
    log_phase "Phase 2: Delete Cloud Run Services"

    log_info "Deleting Cloud Run services and their revisions"
    log_warning "This will delete ALL revisions and cannot be undone"

    for service in "${CLOUD_RUN_SERVICES[@]}"; do
        # Check if service exists
        if gcloud run services describe "$service" --region=$REGION 2>/dev/null; then
            # Show current traffic before deletion
            local traffic=$(gcloud run services describe "$service" --region=$REGION --format="value(status.traffic[0].percent)" 2>/dev/null)
            log_info "Service $service currently has ${traffic}% traffic"

            if confirm_action "Delete Cloud Run service: $service?"; then
                execute_cmd \
                    "gcloud run services delete $service --region=$REGION --project=$PROJECT_ID --quiet" \
                    "Delete Cloud Run service: $service"
            fi
        else
            log_info "Service not found: $service (may already be deleted)"
        fi
    done

    log_success "Phase 2 complete - Cloud Run services removed"
}

# --- Phase 3: Load Balancer Components ---
phase3_load_balancer() {
    log_phase "Phase 3: Delete Load Balancer Components"

    log_info "Load Balancer components must be deleted in order:"
    log_info "  1. Forwarding rules"
    log_info "  2. Target proxies"
    log_info "  3. URL maps"
    log_info "  4. Backend services"
    log_info "  5. SSL certificates"
    log_info "  6. Network Endpoint Groups"

    # Step 3.1: Delete forwarding rules
    log_info "Step 3.1: Deleting forwarding rules..."
    for rule in $(gcloud compute forwarding-rules list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute forwarding-rules delete $rule --global --project=$PROJECT_ID --quiet" \
            "Delete forwarding rule: $rule"
    done

    # Step 3.2: Delete target HTTPS proxies
    log_info "Step 3.2: Deleting target HTTPS proxies..."
    for proxy in $(gcloud compute target-https-proxies list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute target-https-proxies delete $proxy --global --project=$PROJECT_ID --quiet" \
            "Delete HTTPS proxy: $proxy"
    done

    # Step 3.3: Delete target HTTP proxies
    log_info "Step 3.3: Deleting target HTTP proxies..."
    for proxy in $(gcloud compute target-http-proxies list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute target-http-proxies delete $proxy --global --project=$PROJECT_ID --quiet" \
            "Delete HTTP proxy: $proxy"
    done

    # Step 3.4: Delete URL maps
    log_info "Step 3.4: Deleting URL maps..."
    for urlmap in $(gcloud compute url-maps list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute url-maps delete $urlmap --global --project=$PROJECT_ID --quiet" \
            "Delete URL map: $urlmap"
    done

    # Step 3.5: Delete backend services
    log_info "Step 3.5: Deleting backend services..."
    for backend in $(gcloud compute backend-services list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute backend-services delete $backend --global --project=$PROJECT_ID --quiet" \
            "Delete backend service: $backend"
    done

    # Step 3.6: Delete SSL certificates
    log_info "Step 3.6: Deleting SSL certificates..."
    for cert in $(gcloud compute ssl-certificates list --global --format="value(name)" --filter="name~choregami" 2>/dev/null); do
        execute_cmd \
            "gcloud compute ssl-certificates delete $cert --global --project=$PROJECT_ID --quiet" \
            "Delete SSL certificate: $cert"
    done

    # Step 3.7: Delete Network Endpoint Groups
    log_info "Step 3.7: Deleting Network Endpoint Groups..."
    for neg in $(gcloud compute network-endpoint-groups list --format="value(name,zone)" --filter="name~choregami" 2>/dev/null); do
        local neg_name=$(echo "$neg" | cut -f1)
        local neg_zone=$(echo "$neg" | cut -f2)
        execute_cmd \
            "gcloud compute network-endpoint-groups delete $neg_name --zone=$neg_zone --project=$PROJECT_ID --quiet" \
            "Delete NEG: $neg_name"
    done

    log_success "Phase 3 complete - Load Balancer components removed"
}

# --- Phase 4: Static IPs and Final Cleanup ---
phase4_static_ips_cleanup() {
    log_phase "Phase 4: Release Static IPs and Final Cleanup"

    # Step 4.1: Release static IPs
    log_info "Step 4.1: Releasing static IP addresses..."

    # List all global static IPs
    for ip_info in $(gcloud compute addresses list --global --format="value(name,address)" 2>/dev/null); do
        local ip_name=$(echo "$ip_info" | cut -f1)
        local ip_addr=$(echo "$ip_info" | cut -f2)

        log_info "Found static IP: $ip_name ($ip_addr)"

        # Determine if this should be deleted
        local should_delete=false
        local reason=""

        case "$ip_addr" in
            "$LOAD_BALANCER_IP")
                should_delete=true
                reason="Load Balancer IP - replaced by Fly.io"
                ;;
            "$BLOG_IP")
                should_delete=false
                reason="Blog infrastructure - review if still needed"
                log_warning "  Skipping $ip_name - $reason"
                continue
                ;;
            "$CDN_IP")
                should_delete=false
                reason="CDN infrastructure - review if still needed"
                log_warning "  Skipping $ip_name - $reason"
                continue
                ;;
            *)
                log_warning "  Unknown IP - skipping for safety"
                continue
                ;;
        esac

        if [ "$should_delete" = true ]; then
            if confirm_action "Release static IP: $ip_name ($ip_addr) - $reason?"; then
                execute_cmd \
                    "gcloud compute addresses delete $ip_name --global --project=$PROJECT_ID --quiet" \
                    "Release static IP: $ip_name"
            fi
        fi
    done

    # Step 4.2: Clean up old container images
    log_info "Step 4.2: Cleaning up old container images..."
    log_warning "This step is optional - old images can be useful for rollback"

    if confirm_action "Delete old container images from Artifact Registry?"; then
        # Keep last 3 images, delete rest
        local images=$(gcloud artifacts docker images list \
            ${REGION}-docker.pkg.dev/${PROJECT_ID}/geowork-containers \
            --format="value(package,version)" \
            --sort-by="~createTime" 2>/dev/null | tail -n +4)

        if [ -n "$images" ]; then
            while IFS= read -r image_info; do
                local pkg=$(echo "$image_info" | cut -f1)
                local ver=$(echo "$image_info" | cut -f2)
                execute_cmd \
                    "gcloud artifacts docker images delete ${pkg}@${ver} --quiet --delete-tags" \
                    "Delete old image: ${pkg}:${ver}"
            done <<< "$images"
        else
            log_info "No old images to delete"
        fi
    fi

    # Step 4.3: Summary of remaining resources
    log_info "Step 4.3: Checking remaining resources..."

    echo ""
    echo "Remaining resources that were NOT deleted:"
    echo ""

    # Check for remaining resources
    local remaining_services=$(gcloud run services list --region=$REGION --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Cloud Run services: $remaining_services"

    local remaining_ips=$(gcloud compute addresses list --global --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Static IPs: $remaining_ips"

    local remaining_secrets=$(gcloud secrets list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Secrets: $remaining_secrets (kept intentionally)"

    log_success "Phase 4 complete - Cleanup finished"
}

# --- Generate Summary Report ---
generate_summary() {
    log_header "Decommission Summary"

    echo ""
    echo "Decommission completed at: $(date)"
    echo ""
    echo "Log file: $LOG_FILE"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_warning "This was a DRY RUN - no changes were made"
        log_info "Run without --dry-run to execute changes"
    else
        log_success "All specified resources have been decommissioned"
        echo ""
        echo "Next steps:"
        echo "  1. Verify Fly.io is still serving traffic: curl -I https://choregami.app"
        echo "  2. Monitor for any issues over the next 24-48 hours"
        echo "  3. Update any documentation referencing GCP resources"
        echo "  4. Cancel any GCP billing alerts for deleted resources"
    fi

    echo ""
    echo "Estimated monthly savings: \$65-100/month"
    echo "Estimated annual savings: \$780-1,200/year"
}

# --- Main Execution ---
main() {
    parse_args "$@"

    # Initialize log file
    echo "Decommission Log - $(date)" > "$LOG_FILE"
    echo "Project: $PROJECT_ID" >> "$LOG_FILE"
    echo "Region: $REGION" >> "$LOG_FILE"
    echo "DRY_RUN: $DRY_RUN" >> "$LOG_FILE"
    echo "---" >> "$LOG_FILE"

    log_header "GCP Legacy Infrastructure Decommission"
    echo ""
    echo "Project: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Timestamp: $(date)"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  DRY RUN MODE - No changes will be made                        ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  LIVE MODE - Resources will be permanently deleted!            ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"

        if ! confirm_action "Are you sure you want to proceed with LIVE deletion?"; then
            log_info "Aborted by user"
            exit 0
        fi
    fi

    preflight_checks

    # Execute phases
    if [ -z "$SPECIFIC_PHASE" ]; then
        # Run all phases
        phase1_domain_mappings
        phase2_cloud_run_services
        phase3_load_balancer
        phase4_static_ips_cleanup
    else
        # Run specific phase
        case "$SPECIFIC_PHASE" in
            1) phase1_domain_mappings ;;
            2) phase2_cloud_run_services ;;
            3) phase3_load_balancer ;;
            4) phase4_static_ips_cleanup ;;
            *)
                log_error "Invalid phase: $SPECIFIC_PHASE (must be 1-4)"
                exit 1
                ;;
        esac
    fi

    generate_summary
}

# Run main function
main "$@"

#!/bin/bash

# =============================================================================
# ChoreGami 2026 Fly.io Deployment Script
# =============================================================================
# 
# This script provides a complete deployment workflow for ChoreGami 2026:
# 1. Validates all required secrets and environment variables
# 2. Deploys secrets to Fly.io
# 3. Deploys the application to https://choregami.fly.dev
# 4. Runs post-deployment validation
#
# Usage (run from project root):
#   chmod +x deployment/deploy.sh
#   ./deployment/deploy.sh
#
# =============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/georgekariuki/repos/deno2/chores2026"
ENV_FILE="$PROJECT_ROOT/.env"
APP_NAME="choregami"
BASE_URL="https://choregami.fly.dev"

# Test tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
VALIDATION_ERRORS=()

# Logging functions
log_header() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
}

log_section() {
    echo -e "\n${PURPLE}📋 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s─' {1..60})${NC}"
}

log_step() {
    echo -e "${CYAN}🔧 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    VALIDATION_ERRORS+=("$1")
    ((FAILED_CHECKS++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

increment_check() {
    ((TOTAL_CHECKS++))
}

# Pre-flight checks
pre_flight_checks() {
    log_section "Pre-Flight Checks"
    
    # Check if we're in the right directory
    increment_check
    if [[ ! -d "$PROJECT_ROOT" ]]; then
        log_error "Project directory not found: $PROJECT_ROOT"
        return 1
    fi
    cd "$PROJECT_ROOT" || exit 1
    log_success "Project directory verified: $PROJECT_ROOT"
    
    # Check Fly CLI
    increment_check
    if ! command -v fly &> /dev/null; then
        log_error "Fly CLI not installed. Install from: https://fly.io/docs/flyctl/"
        return 1
    fi
    log_success "Fly CLI installed: $(fly version | head -1)"
    
    # Check Fly authentication
    increment_check
    if ! fly auth whoami &> /dev/null; then
        log_error "Not authenticated with Fly.io. Run: fly auth login"
        return 1
    fi
    log_success "Fly.io authentication verified: $(fly auth whoami)"
    
    # Check required files
    local required_files=(
        "$ENV_FILE"
        "deployment/Dockerfile"
        "deployment/fly.toml"
        "main.ts"
        "fresh.gen.ts"
    )
    
    for file in "${required_files[@]}"; do
        increment_check
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            return 1
        fi
        log_success "Required file found: $(basename "$file")"
    done
}

# Validate environment variables and secrets
validate_secrets() {
    log_section "Environment Variables & Secrets Validation"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Required environment variables for ChoreGami 2026
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_KEY"
        "FAMILYSCORE_API_KEY"
        "FAMILYSCORE_BASE_URL"
        "FAMILYSCORE_WEBSOCKET_URL"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "META_APP_ID"
        "META_APP_SECRET"
    )
    
    log_step "Checking required environment variables..."
    for var in "${required_vars[@]}"; do
        increment_check
        if [[ -z "${!var}" ]]; then
            log_error "Missing required environment variable: $var"
        else
            # Don't log the actual values for security
            log_success "Environment variable set: $var"
        fi
    done
    
    # Validate URLs
    increment_check
    if [[ "$SUPABASE_URL" =~ ^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_success "SUPABASE_URL format valid"
    else
        log_error "SUPABASE_URL format invalid: $SUPABASE_URL"
    fi
    
    increment_check
    if [[ "$FAMILYSCORE_BASE_URL" =~ ^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_success "FAMILYSCORE_BASE_URL format valid"
    else
        log_error "FAMILYSCORE_BASE_URL format invalid: $FAMILYSCORE_BASE_URL"
    fi
    
    # Check for API key format
    increment_check
    if [[ "$FAMILYSCORE_API_KEY" =~ ^fsc_[a-zA-Z0-9_]+ ]]; then
        log_success "FAMILYSCORE_API_KEY format valid"
    else
        log_error "FAMILYSCORE_API_KEY format invalid (should start with 'fsc_')"
    fi
}

# Deploy secrets and application
deploy_application() {
    log_section "Deployment to Fly.io"

    # Generate deployment version
    log_step "Generating deployment version..."
    local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local deploy_timestamp=$(date +%Y%m%d.%H%M%S)
    local app_version="prod-v${git_commit}-${deploy_timestamp}"
    log_success "Version generated: ${app_version}"

    # Check if app exists, create if not
    log_step "Checking Fly.io app status..."
    if ! fly status -a "$APP_NAME" &> /dev/null; then
        log_step "Creating new Fly.io app: $APP_NAME"
        fly apps create "$APP_NAME"
        log_success "Created new app: $APP_NAME"
    else
        log_success "App exists: $APP_NAME"
    fi
    
    # Deploy secrets atomically (fast - single machine restart)
    log_step "Deploying secrets atomically to Fly.io..."

    # Filter out comments and empty lines, then import all at once
    # This is MUCH faster than multiple `fly secrets set` calls
    grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | fly secrets import -a "$APP_NAME"

    # Set APP_VERSION separately (not in .env file)
    fly secrets set -a "$APP_NAME" APP_VERSION="$app_version"
    log_success "Secrets imported atomically + version set: $app_version"
    
    # Deploy application (using config from deployment folder)
    log_step "Deploying application to Fly.io..."
    if fly deploy -a "$APP_NAME" -c deployment/fly.toml; then
        log_success "Application deployment completed"
    else
        log_error "Application deployment failed"
        return 1
    fi
}

# Wait for application to be ready
wait_for_application() {
    log_section "Waiting for Application to Start"
    
    local max_attempts=20
    local attempt=1
    
    log_step "Waiting for application to respond (max ${max_attempts}0 seconds)..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s --max-time 10 "$BASE_URL/health" > /dev/null 2>&1; then
            log_success "Application is responding after ${attempt}0 seconds"
            return 0
        fi
        
        echo -n "."
        sleep 10
        ((attempt++))
    done
    
    log_error "Application failed to respond after ${max_attempts}0 seconds"
    return 1
}

# Run post-deployment validation
run_post_deployment_tests() {
    log_section "Post-Deployment Validation"
    
    # Test health endpoint
    log_step "Testing health endpoint..."
    increment_check
    local health_response=$(curl -s "$BASE_URL/health" || echo "")
    if [[ "$health_response" =~ "healthy" ]] && [[ "$health_response" =~ "choregami" ]]; then
        log_success "Health endpoint responding correctly"
    else
        log_error "Health endpoint not responding properly: $health_response"
    fi
    
    # Test main page
    log_step "Testing main application page..."
    increment_check
    local main_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || echo "000")
    if [[ "$main_response" == "200" ]]; then
        log_success "Main page accessible (HTTP 200)"
    else
        log_error "Main page not accessible (HTTP $main_response)"
    fi
    
    # Test WebSocket endpoint info
    log_step "Testing WebSocket endpoint availability..."
    increment_check
    local ws_test_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/familyscore/live/test" || echo "000")
    if [[ "$ws_test_response" == "400" ]] || [[ "$ws_test_response" == "401" ]] || [[ "$ws_test_response" == "404" ]]; then
        log_success "WebSocket endpoint responding (expected error for test request)"
    else
        log_warning "WebSocket endpoint response unexpected (HTTP $ws_test_response)"
    fi
}

# Check application logs for errors
check_application_logs() {
    log_section "Application Logs Check"
    
    log_step "Checking recent application logs for errors..."
    
    # Get recent logs and check for critical errors
    local logs=$(fly logs -a "$APP_NAME" --limit 20 2>/dev/null || echo "")
    
    if [[ -z "$logs" ]]; then
        log_warning "Could not retrieve application logs"
        return 0
    fi
    
    # Check for critical error patterns
    local error_patterns=(
        "ERROR"
        "CRASH"
        "Failed to start"
        "Connection refused"
        "Database connection failed"
    )
    
    local errors_found=false
    for pattern in "${error_patterns[@]}"; do
        if echo "$logs" | grep -qi "$pattern"; then
            log_warning "Found potential issue in logs: $pattern"
            errors_found=true
        fi
    done
    
    if [[ "$errors_found" == false ]]; then
        log_success "No critical errors found in recent logs"
    fi
    
    # Show last 5 log lines for context
    log_info "Recent log entries:"
    echo "$logs" | tail -5 | sed 's/^/  /'
}

# Generate deployment report
generate_deployment_report() {
    log_section "Deployment Summary Report"
    
    echo -e "\n${BLUE}📊 DEPLOYMENT STATISTICS${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..40})${NC}"
    echo -e "Total Checks: ${TOTAL_CHECKS}"
    echo -e "Passed: ${GREEN}${PASSED_CHECKS}${NC}"
    echo -e "Failed: ${RED}${FAILED_CHECKS}${NC}"
    
    if [[ ${#VALIDATION_ERRORS[@]} -gt 0 ]]; then
        echo -e "\n${RED}❌ VALIDATION ERRORS:${NC}"
        for error in "${VALIDATION_ERRORS[@]}"; do
            echo -e "  • $error"
        done
    fi
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "\n${BLUE}Success Rate: ${success_rate}%${NC}"
    
    if [[ $success_rate -ge 90 ]]; then
        echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESS!${NC}"
        echo -e "${GREEN}ChoreGami 2026 is ready for production use.${NC}"
    elif [[ $success_rate -ge 75 ]]; then
        echo -e "\n${YELLOW}⚠️  DEPLOYMENT COMPLETED WITH WARNINGS${NC}"
        echo -e "${YELLOW}Review the warnings above before using in production.${NC}"
    else
        echo -e "\n${RED}❌ DEPLOYMENT FAILED${NC}"
        echo -e "${RED}Critical issues must be resolved before production use.${NC}"
        return 1
    fi
    
    # Show useful URLs
    echo -e "\n${BLUE}📋 USEFUL LINKS${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..40})${NC}"
    echo -e "• Application: $BASE_URL"
    echo -e "• Health Check: $BASE_URL/health"
    echo -e "• Monitor Logs: fly logs -a $APP_NAME --follow"
    echo -e "• App Status: fly status -a $APP_NAME"
    echo -e "• SSH Access: fly ssh console -a $APP_NAME"
    
    echo -e "\n${BLUE}🔧 MANAGEMENT COMMANDS${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..40})${NC}"
    echo -e "• Scale up: fly scale count 2 -a $APP_NAME"
    echo -e "• Scale down: fly scale count 1 -a $APP_NAME"
    echo -e "• Restart: fly deploy -a $APP_NAME"
    echo -e "• View metrics: fly status -a $APP_NAME --verbose"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    log_header "ChoreGami 2026 Fly.io Deployment"
    echo -e "Starting deployment process at $(date)"
    echo -e "Target: $BASE_URL"
    echo ""
    
    # Run all deployment phases
    if pre_flight_checks && \
       validate_secrets && \
       deploy_application && \
       wait_for_application && \
       run_post_deployment_tests; then
        
        check_application_logs
        generate_deployment_report
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_header "Deployment Completed Successfully!"
        echo -e "${GREEN}Total deployment time: ${duration} seconds${NC}"
        echo -e "${GREEN}ChoreGami 2026 is now live at: $BASE_URL${NC}"
        
        return 0
    else
        generate_deployment_report
        
        log_header "Deployment Failed!"
        echo -e "${RED}Please review the errors above and fix them before retrying.${NC}"
        
        return 1
    fi
}

# Run main function
main "$@"
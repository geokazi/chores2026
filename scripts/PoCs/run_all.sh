#!/bin/bash
# POC Runner — Cron Fallback Verification
# Run each POC individually (they need separate terminals)
#
# Usage: bash scripts/PoCs/run_all.sh [1|2|3]

cd "$(dirname "$0")/../.."

case "${1:-help}" in
  1)
    echo "=== POC 1: Deno.cron (runs for ~3 minutes) ==="
    echo "Expect: 'CRON FIRED' messages every 60 seconds"
    echo ""
    deno run --allow-env --allow-read --unstable-cron scripts/PoCs/poc1_deno_cron.ts
    ;;
  2)
    echo "=== POC 2: HTTP Secret Endpoint ==="
    echo "Server will start on port 8099. Test with:"
    echo "  curl http://localhost:8099/api/cron/weekly-digest"
    echo "  curl 'http://localhost:8099/api/cron/weekly-digest?secret=wrong'"
    echo "  curl 'http://localhost:8099/api/cron/weekly-digest?secret=chgm_cron_9f7a3b2e1d5c4680'"
    echo ""
    deno run --allow-env --allow-read --allow-net scripts/PoCs/poc2_http_secret.ts
    ;;
  3)
    echo "=== POC 3: JSONB Idempotency ==="
    echo "Expect: SENT → SKIPPED → SENT"
    echo ""
    deno run --allow-env --allow-read --allow-net scripts/PoCs/poc3_idempotent_send.ts
    ;;
  *)
    echo "Cron Fallback POCs — Run individually:"
    echo ""
    echo "  bash scripts/PoCs/run_all.sh 1   # Deno.cron (3 min wait)"
    echo "  bash scripts/PoCs/run_all.sh 2   # HTTP secret (interactive server)"
    echo "  bash scripts/PoCs/run_all.sh 3   # JSONB idempotency (instant)"
    echo ""
    echo "POC 3 is fastest to verify (~5 seconds)."
    echo "POC 2 requires a second terminal for curl."
    echo "POC 1 requires 2-3 minutes of patience."
    ;;
esac

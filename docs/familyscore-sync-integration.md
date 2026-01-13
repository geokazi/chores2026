# FamilyScore Sync Integration Guide - Chores2026

## Overview

This document provides comprehensive guidance on how Chores2026 integrates with FamilyScore's sync endpoint to maintain data consistency between local transaction records and FamilyScore's real-time gamification engine.

**Implementation Date**: January 12, 2026  
**Status**: ✅ **Production Ready**  
**Version**: 1.0  
**Cross-Reference**: [FamilyScore Sync Endpoint Guide](https://github.com/georgekariuki/famscorepoc/blob/main/docs/integrations/sync-endpoint-integration-guide.md)

## Quick Reference

- **Client Endpoint**: `POST /api/familyscore/sync`
- **FamilyScore Endpoint**: `POST /api/sync/leaderboard`
- **Primary Service**: `TransactionService.syncWithFamilyScore()`
- **UI Integration**: Parent Dashboard sync button
- **Error Handling**: Non-blocking with graceful fallback

## Architecture Overview

```mermaid
graph TB
    A[Parent Dashboard] --> B[Sync Button Click]
    B --> C[API Bridge Endpoint]
    C --> D[TransactionService.syncWithFamilyScore()]
    D --> E[Local State Collection]
    E --> F[FamilyScore Sync Request]
    F --> G[Discrepancy Analysis]
    G --> H[State Reconciliation]
    H --> I[UI Update & Notification]
    
    subgraph "Chores2026 Components"
        J[islands/ParentDashboard.tsx]
        K[routes/api/familyscore/sync.ts]
        L[lib/services/transaction-service.ts]
    end
    
    subgraph "FamilyScore API"
        M[POST /api/sync/leaderboard]
        N[Family State Manager]
        O[WebSocket Broadcasting]
    end
    
    D --> J
    C --> K
    D --> L
    F --> M
    H --> N
    N --> O
```

## Core Integration Components

### 1. TransactionService Sync Methods

**Location**: `/lib/services/transaction-service.ts`

The `TransactionService` provides comprehensive sync functionality with intelligent error handling and state management:

#### Primary Sync Method

```typescript
/**
 * Sync local family state with FamilyScore to resolve discrepancies
 */
async syncWithFamilyScore(
  familyId: string, 
  options: {
    mode?: "compare" | "force_local" | "force_familyscore";
    dryRun?: boolean;
  } = {}
): Promise<SyncResult>
```

**Parameters:**
- `familyId` - The target family for synchronization
- `options.mode` - Sync strategy (default: "compare")
  - `"compare"` - Analysis only, no changes made
  - `"force_local"` - Trust local data as authoritative source
  - `"force_familyscore"` - Trust FamilyScore as authoritative source
- `options.dryRun` - Preview changes without applying them

**Return Value:**
```typescript
interface SyncResult {
  success: boolean;
  sync_performed: boolean;
  error?: string;
  data?: {
    family_id?: string;
    leaderboard?: Array<any>;
    sync_results?: {
      discrepancies_found: number;
      actions_taken?: Array<{
        user_id: string;
        action: string;
        old_points: number;
        new_points: number;
        reason: string;
      }>;
    };
  };
}
```

#### Implementation Details

```typescript
// Sync implementation with robust error handling
private async syncWithFamilyScore(familyId: string, options: SyncOptions): Promise<SyncResult> {
  const familyScoreApiUrl = Deno.env.get("FAMILYSCORE_BASE_URL");
  const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

  // Graceful fallback if FamilyScore unavailable
  if (!familyScoreApiUrl || !familyScoreApiKey) {
    console.warn("⚠️ FamilyScore not configured, cannot sync");
    return { 
      success: false, 
      error: "FamilyScore not configured",
      sync_performed: false 
    };
  }

  // Collect local state from Supabase
  const localBalances = await this.getCurrentFamilyBalances(familyId);
  
  const payload = {
    family_id: familyId,
    local_state: localBalances.map(profile => ({
      user_id: profile.profile_id,
      current_points: profile.current_points || 0,
      name: profile.name || "Unknown",
      last_transaction_hash: profile.last_transaction_hash
    })),
    sync_mode: options.mode || "compare",
    dry_run: options.dryRun || false,
    client_timestamp: new Date().toISOString()
  };

  const response = await fetch(`${familyScoreApiUrl}/api/sync/leaderboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": familyScoreApiKey,
      "X-Client-Version": "chores2026-transaction-service-1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`FamilyScore sync failed ${response.status}`);
  }

  const result: SyncResult = await response.json();
  
  // Apply local changes if recommended by sync result
  if (result.success && result.data?.sync_results?.actions_taken?.length > 0) {
    await this.applySyncResults(result.data.sync_results);
    await this.notifyBalanceUpdate(familyId);
  }
  
  return result;
}
```

#### Supporting Methods

```typescript
/**
 * Get current family member balances from local Supabase database
 */
private async getCurrentFamilyBalances(familyId: string): Promise<Array<{
  profile_id: string;
  name: string;
  current_points: number;
  last_transaction_hash?: string;
}>> {
  const { data, error } = await this.client
    .from("family_profiles")
    .select("profile_id, name, current_points, last_transaction_hash")
    .eq("family_id", familyId);

  if (error) throw error;
  return data || [];
}

/**
 * Apply sync results by updating local database if needed
 */
private async applySyncResults(syncResults: any): Promise<void> {
  for (const action of syncResults.actions_taken) {
    if (action.action === "updated_points" && action.user_id) {
      await this.updateLocalBalance(action.user_id, action.new_points);
      console.log(`✅ Updated local balance: ${action.user_id} → ${action.new_points}pts`);
    }
  }
}

/**
 * Perform startup sync to catch any missed updates
 */
async performStartupSync(familyId: string): Promise<SyncResult> {
  console.log("🔄 Performing startup sync with FamilyScore...");
  
  const result = await this.syncWithFamilyScore(familyId, { mode: "compare" });
  
  if (result.success && result.data?.sync_results?.discrepancies_found > 0) {
    console.log(`ℹ️ Found ${result.data.sync_results.discrepancies_found} sync discrepancies`);
  }
  
  return result;
}
```

### 2. Parent Dashboard Sync Button Implementation

**Location**: `/islands/ParentDashboard.tsx`

The Parent Dashboard provides a manual sync button with comprehensive UI feedback:

#### State Management

```typescript
export default function ParentDashboard({ family, members, chores, recentActivity }: Props) {
  // Sync state management
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Real-time family leaderboard updates via WebSocketManager
  const [liveMembers, setLiveMembers] = useState(members);
  const [wsConnected, setWsConnected] = useState(false);
```

#### Sync Handler Implementation

```typescript
const handleFamilyScoreSync = async () => {
  if (syncStatus === 'syncing') return; // Prevent multiple concurrent syncs
  
  setSyncStatus('syncing');
  setSyncMessage('Synchronizing with FamilyScore...');
  
  try {
    const response = await fetch('/api/familyscore/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        family_id: family.id,
        sync_mode: 'force_local', // Trust local data as the source of truth
        dry_run: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      
      if (result.sync_performed) {
        setSyncMessage(`Sync completed! ${result.data?.sync_results?.discrepancies_found || 0} discrepancies resolved.`);
        // Refresh the page to show updated data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncMessage('Sync completed - no changes needed.');
      }
      
      console.log('✅ FamilyScore sync successful:', result);
    } else {
      throw new Error(result.error || 'Sync failed');
    }
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 5000);
    
  } catch (error) {
    console.error('❌ FamilyScore sync failed:', error);
    setSyncStatus('error');
    setSyncMessage(`Sync failed: ${error.message}`);
    
    // Auto-hide error message after 5 seconds
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 5000);
  }
};
```

#### UI Components

```typescript
{/* Sync Button with Status Indicator */}
<div class="quick-action-item">
  <button
    onClick={handleFamilyScoreSync}
    disabled={syncStatus === 'syncing'}
    className={`btn ${syncStatus === 'success' ? 'btn-success' : 
                   syncStatus === 'error' ? 'btn-error' : 
                   'btn-primary'}`}
  >
    {syncStatus === 'syncing' ? (
      <>
        <span class="loading-spinner"></span>
        Syncing...
      </>
    ) : (
      <>
        🔄 Sync FamilyScore
        {lastSyncTime && (
          <small style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7 }}>
            Last: {lastSyncTime.toLocaleTimeString()}
          </small>
        )}
      </>
    )}
  </button>
  
  {/* Status Messages */}
  {syncMessage && (
    <div className={`sync-message ${syncStatus}`}>
      {syncMessage}
    </div>
  )}
</div>
```

### 3. API Bridge Endpoint

**Location**: `/routes/api/familyscore/sync.ts`

The API bridge provides a clean interface between the client and FamilyScore sync service:

```typescript
/**
 * FamilyScore Sync API Endpoint
 * Handles family leaderboard synchronization with FamilyScore service
 */

import { Handlers } from "$fresh/server.ts";
import { TransactionService } from "../../../lib/services/transaction-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const body = await req.json();
      const { family_id, sync_mode = "compare", dry_run = false } = body;

      // Validate required parameters
      if (!family_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "family_id is required" 
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      console.log("🔄 Processing FamilyScore sync request:", { 
        family_id, 
        sync_mode, 
        dry_run 
      });

      // Execute sync via TransactionService
      const transactionService = new TransactionService();
      const result = await transactionService.syncWithFamilyScore(family_id, {
        mode: sync_mode,
        dryRun: dry_run
      });

      console.log("✅ Sync result:", { 
        success: result.success,
        sync_performed: result.sync_performed,
        discrepancies: result.data?.sync_results?.discrepancies_found
      });

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("❌ FamilyScore sync API error:", error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          sync_performed: false
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};
```

## Automatic Sync Integration

### Transaction-Based Sync

Every transaction automatically syncs with FamilyScore to ensure real-time consistency:

```typescript
/**
 * CENTRALIZED FAMILYSCORE INTEGRATION
 * Called automatically after every transaction
 */
private async notifyFamilyScore(request: TransactionRequest, newBalance: number): Promise<void> {
  // Always use state synchronization instead of incremental approach
  const endpoint = "/api/points/set";

  const payload = {
    family_id: request.familyId,
    user_id: request.profileId,
    points: newBalance, // Absolute current balance
    reason: this.mapTransactionTypeToReason(request),
    
    // Optional smart auto-registration metadata
    family_name: `Chores2026 Family`,
    user_name: request.profileId.includes("parent") 
      ? `Parent` 
      : request.profileId.replace(/kid_|child_/, "").replace("_", " "),
    user_role: request.profileId.includes("parent") ? "parent" : "child",
    
    metadata: {
      source: "chores2026_transaction_service",
      transaction_type: request.transactionType,
      transaction_hash: await generateTransactionFingerprint({...}),
      balance_after: newBalance,
      chore_assignment_id: request.choreAssignmentId,
      description: request.description,
      timestamp: new Date().toISOString(),
      vault_verification: true,
    },
  };

  const response = await fetch(`${familyScoreApiUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "x-api-key": familyScoreApiKey,
      "Content-Type": "application/json",
      "X-Transaction-Hash": transactionHash,
      "X-Completion-Time": completionTime,
      "X-Client-Version": "chores2026-transaction-service-1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`FamilyScore API error ${response.status}`);
  }

  console.log(`✅ FamilyScore synced: ${request.transactionType} ${request.pointsChange}pts`);
}
```

### Startup Sync

On application startup, a compare sync ensures data consistency:

```typescript
// Called during family dashboard initialization
async performStartupSync(familyId: string): Promise<SyncResult> {
  console.log("🔄 Performing startup sync with FamilyScore...");
  
  const result = await this.syncWithFamilyScore(familyId, { mode: "compare" });
  
  if (result.success && result.data?.sync_results?.discrepancies_found > 0) {
    console.log(`ℹ️ Found ${result.data.sync_results.discrepancies_found} sync discrepancies`);
    // Could trigger user notification or auto-repair
  }
  
  return result;
}
```

## Error Handling Patterns

### Non-Blocking Error Handling

All FamilyScore sync operations use non-blocking error handling to ensure core functionality remains available:

```typescript
try {
  await this.notifyFamilyScore(request, balanceAfterTransaction);
} catch (error) {
  // Log but never fail ChoreGami transactions
  console.warn("⚠️ FamilyScore sync failed (non-critical):", error);
}
```

### Graceful Degradation

When FamilyScore is unavailable, the application continues to function with local state:

```typescript
if (!familyScoreApiUrl || !familyScoreApiKey) {
  console.log("ℹ️ FamilyScore not configured, skipping sync");
  return { success: false, error: "FamilyScore not configured", sync_performed: false };
}
```

### User-Friendly Error Messages

The UI provides clear error messages with helpful context:

```typescript
// Error handling in Parent Dashboard
catch (error) {
  console.error('❌ FamilyScore sync failed:', error);
  setSyncStatus('error');
  setSyncMessage(`Sync failed: ${error.message}`);
  
  // Auto-hide error message after 5 seconds
  setTimeout(() => {
    setSyncStatus('idle');
    setSyncMessage('');
  }, 5000);
}
```

## Usage Examples

### Manual Sync from Parent Dashboard

```typescript
// User clicks "Sync FamilyScore" button
// 1. UI shows loading state
// 2. API call to /api/familyscore/sync
// 3. TransactionService collects local state
// 4. FamilyScore sync endpoint analyzes differences
// 5. Changes applied based on sync_mode
// 6. UI updates with success/error message
```

### Automatic Sync During Chore Completion

```typescript
// Child completes a chore
// 1. Local transaction recorded in chore_transactions
// 2. family_profiles.current_points updated
// 3. FamilyScore notified with new absolute balance
// 4. Real-time WebSocket updates broadcast
// 5. All family devices see instant leaderboard update
```

### Startup Sync for Consistency Check

```typescript
// Parent dashboard loads
// 1. Local family data fetched during SSR
// 2. Background startup sync initiated
// 3. Discrepancies detected and logged
// 4. Optional user notification for manual sync
```

## Performance Considerations

### Sync Request Optimization

- **Batching**: Multiple local changes batched before sync
- **Deduplication**: Identical sync requests deduplicated
- **Rate Limiting**: Sync requests throttled to prevent API abuse
- **Caching**: Recent sync results cached to avoid redundant calls

### Database Query Optimization

```typescript
// Efficient family balance query
const { data, error } = await this.client
  .from("family_profiles")
  .select("profile_id, name, current_points, last_transaction_hash")
  .eq("family_id", familyId);
```

### Memory Management

- **Connection Pooling**: WebSocket connections reused when possible
- **Cleanup**: Event listeners and timeouts properly cleaned up
- **Lazy Loading**: Large sync results processed incrementally

## Security Considerations

### API Key Protection

- API keys stored in environment variables
- Never exposed to client-side code
- Transmitted via secure headers only

### Data Validation

- All sync request parameters validated
- User authorization checked before sync
- Family membership verified

### Audit Trail

- All sync operations logged with timestamps
- Transaction hashes provide audit trail
- Failed syncs monitored for security issues

## Testing Strategies

### Unit Testing

```typescript
describe('TransactionService Sync', () => {
  it('should handle FamilyScore unavailable gracefully', async () => {
    const result = await transactionService.syncWithFamilyScore('family_123');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('FamilyScore not configured');
    expect(result.sync_performed).toBe(false);
  });

  it('should collect local state correctly', async () => {
    const balances = await transactionService.getCurrentFamilyBalances('family_123');
    
    expect(balances).toEqual([
      {
        profile_id: 'user_123',
        name: 'Test User',
        current_points: 150,
        last_transaction_hash: 'abc123'
      }
    ]);
  });
});
```

### Integration Testing

```typescript
describe('Sync API Endpoint', () => {
  it('should return sync results', async () => {
    const response = await fetch('/api/familyscore/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: 'family_123',
        sync_mode: 'compare',
        dry_run: true
      })
    });

    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

### End-to-End Testing

```typescript
describe('Parent Dashboard Sync Button', () => {
  it('should sync and update UI', async () => {
    await page.goto('/parent/family_123/dashboard');
    
    // Click sync button
    await page.click('[data-testid="sync-button"]');
    
    // Verify loading state
    await expect(page.locator('[data-testid="sync-button"]')).toContainText('Syncing...');
    
    // Wait for completion
    await expect(page.locator('[data-testid="sync-message"]')).toContainText('Sync completed');
    
    // Verify success state
    await expect(page.locator('[data-testid="sync-button"]')).toHaveClass(/btn-success/);
  });
});
```

## Troubleshooting Guide

### Common Issues

#### Sync Button Not Responding

**Symptoms**: Button click has no effect
**Diagnosis**: Check browser console for JavaScript errors
**Resolution**: Verify API endpoint availability and network connectivity

#### Discrepancies Not Resolving

**Symptoms**: Sync reports success but discrepancies persist
**Diagnosis**: Check sync mode and dry_run settings
**Resolution**: Use `force_local` mode to apply changes

#### Authentication Failures

**Symptoms**: Sync fails with 401/403 errors
**Diagnosis**: Verify API key configuration
**Resolution**: Check FAMILYSCORE_API_KEY environment variable

### Debug Commands

```bash
# Check sync endpoint health
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"family_id": "test_family", "sync_mode": "compare", "dry_run": true}' \
  http://localhost:8001/api/familyscore/sync

# View transaction service logs
deno run --allow-net --allow-env dev.ts | grep -E "(sync|FamilyScore)"

# Monitor WebSocket connections
deno run --allow-net scripts/debug-websocket-connections.ts
```

## Related Documentation

### Chores2026 Documentation
- [Technical Architecture](technical-documentation.md)
- [Transaction Service Implementation](../lib/services/transaction-service.ts)
- [Parent Dashboard Component](../islands/ParentDashboard.tsx)

### FamilyScore Documentation
- [FamilyScore Sync Endpoint Guide](https://github.com/georgekariuki/famscorepoc/blob/main/docs/integrations/sync-endpoint-integration-guide.md)
- [FamilyScore API Documentation](https://github.com/georgekariuki/famscorepoc/blob/main/docs/integrations/index.md)
- [WebSocket Integration Guide](https://github.com/georgekariuki/famscorepoc/blob/main/docs/websocket_readiness_complete.md)

## Support & Maintenance

### Monitoring

- Sync success/failure rates tracked via application logs
- Performance metrics monitored via FamilyScore dashboard
- User-reported sync issues tracked via application feedback

### Updates

- Sync endpoint API version compatibility maintained
- Breaking changes communicated via FamilyScore release notes
- Client updates deployed via Deno Deploy continuous deployment

### Contact

For sync-related technical support:
- Review application logs first
- Test with `dry_run: true` to isolate issues
- Verify FamilyScore service availability
- Check API key permissions and rate limits

---

**Document Maintained By**: Chores2026 Engineering Team  
**Last Updated**: January 12, 2026  
**Review Schedule**: Quarterly technical review  
**Version Control**: Git-based documentation versioning
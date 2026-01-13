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
      const { family_id, local_state, sync_mode = "force_local", dry_run = false } = body;

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

      // Validate local_state when using force_local mode
      if (sync_mode === "force_local" && (!local_state || !Array.isArray(local_state))) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "local_state is required for force_local sync mode" 
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
        dry_run,
        local_state_provided: !!local_state,
        member_count: local_state?.length || 0
      });

      const transactionService = new TransactionService();
      
      const result = await transactionService.syncWithFamilyScore(family_id, {
        mode: sync_mode,
        dryRun: dry_run,
        localState: local_state // Pass local_state to the service
      });

      console.log("✅ Sync result:", { 
        success: result.success,
        sync_performed: result.sync_performed,
        discrepancies: result.data?.sync_results?.discrepancies_found,
        actions_taken: result.data?.sync_results?.actions_taken?.length || 0
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
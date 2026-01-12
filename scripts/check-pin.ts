#!/usr/bin/env deno run -A

/**
 * Check PIN Script
 * Verifies Dad's PIN hash in the database
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function checkPin() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check Dad's PIN hash
    const { data, error } = await supabase
      .from("family_profiles")
      .select("id, name, role, pin_hash")
      .eq("name", "Dad")
      .eq("role", "parent")
      .single();

    if (error) {
      console.error("❌ Error fetching Dad's data:", error);
      return;
    }

    console.log("👨 Dad's profile:", {
      id: data.id,
      name: data.name,
      role: data.role,
      hasPinHash: !!data.pin_hash,
      pinHashFormat: data.pin_hash ? data.pin_hash.substring(0, 10) + "..." : "none"
    });

    // Test PIN verification using ChoreService (same as the API)
    if (data.pin_hash) {
      try {
        const { ChoreService } = await import("../lib/services/chore-service.ts");
        const choreService = new ChoreService();
        
        console.log("🔧 Testing PIN verification with ChoreService...");
        const isValid4658 = await choreService.verifyMemberPin(data.id, "4658");
        const isValid1234 = await choreService.verifyMemberPin(data.id, "1234");
        
        console.log("🔧 PIN verification tests:");
        console.log("- PIN 4658:", isValid4658 ? "✅ Valid" : "❌ Invalid");
        console.log("- PIN 1234:", isValid1234 ? "✅ Valid" : "❌ Invalid");
        
      } catch (verifyError) {
        console.error("❌ PIN verification error:", verifyError);
      }
    } else {
      console.log("❌ No PIN hash found for Dad");
    }

  } catch (error) {
    console.error("❌ Error checking PIN:", error);
  }
}

if (import.meta.main) {
  await checkPin();
}
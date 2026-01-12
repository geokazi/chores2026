#!/usr/bin/env deno run -A

/**
 * Setup Default PINs Script
 * Sets Dad's PIN to default 1234 for initial testing
 */

import { createClient } from "@supabase/supabase-js";
import { ChoreService } from "../lib/services/chore-service.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

async function setupDefaultPins() {
  try {
    console.log("🔧 Setting up default PINs...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const choreService = new ChoreService();

    // Find Dad in the family profiles
    const { data: parents, error } = await supabase
      .from("family_profiles")
      .select("id, name, family_id, pin_hash")
      .eq("role", "parent")
      .eq("name", "Dad");

    if (error || !parents || parents.length === 0) {
      console.error("❌ Could not find Dad in family profiles:", error);
      return;
    }

    const dad = parents[0];
    console.log("👨 Found Dad:", { id: dad.id, name: dad.name, hasPinHash: !!dad.pin_hash });

    // Set Dad's PIN to default 1234
    console.log("🔧 Setting Dad's PIN to default 1234...");
    const success = await choreService.setDefaultParentPin(dad.id);
    
    if (success) {
      console.log("✅ Dad's PIN set to default 1234 successfully");
      console.log("🔐 Dad can now use PIN 1234 to access parent features");
      console.log("⚠️  Dad will be required to change this default PIN on first use");
    } else {
      console.error("❌ Failed to set Dad's PIN");
    }

  } catch (error) {
    console.error("❌ Error setting up default PINs:", error);
  }
}

if (import.meta.main) {
  await setupDefaultPins();
}
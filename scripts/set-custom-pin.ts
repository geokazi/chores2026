#!/usr/bin/env deno run -A

/**
 * Set Custom PIN Script
 * Sets Dad's PIN to a custom value for testing
 */

import { ChoreService } from "../lib/services/chore-service.ts";

const pin = Deno.args[0];
if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
  console.error("❌ Please provide a 4-digit numeric PIN");
  console.log("Usage: deno run -A scripts/set-custom-pin.ts 4658");
  Deno.exit(1);
}

async function setCustomPin() {
  try {
    console.log(`🔧 Setting Dad's PIN to ${pin}...`);
    
    const choreService = new ChoreService();

    // Dad's ID from the previous script
    const dadId = "8349a1b3-b716-4744-91fd-dd2e28e71bc3";
    
    const success = await choreService.setKidPin(dadId, pin);
    
    if (success) {
      console.log(`✅ Dad's PIN set to ${pin} successfully`);
      console.log("🔐 Dad can now use this PIN to access parent features");
    } else {
      console.error("❌ Failed to set Dad's PIN");
    }

  } catch (error) {
    console.error("❌ Error setting custom PIN:", error);
  }
}

if (import.meta.main) {
  await setCustomPin();
}
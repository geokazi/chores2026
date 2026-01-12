#!/usr/bin/env deno run -A

/**
 * Debug Parent Match Script
 * Check if the authenticated user matches Dad's profile
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function debugParentMatch() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user (from the debug session)
    const authenticatedUserId = "a0854e6e"; // From your session (truncated)
    
    // Find all profiles for this family
    const { data: profiles, error } = await supabase
      .from("family_profiles")
      .select("id, name, role, user_id, family_id, pin_hash")
      .eq("family_id", "445717ba-0841-4b68-994f-eef77bcf4f87");

    if (error) {
      console.error("❌ Error fetching profiles:", error);
      return;
    }

    console.log("👨‍👩‍👧‍👦 Family profiles:");
    profiles.forEach(profile => {
      console.log(`- ${profile.name} (${profile.role}): ${profile.id}`);
      console.log(`  user_id: ${profile.user_id || 'null'}`);
      console.log(`  has_pin: ${!!profile.pin_hash}`);
      
      if (profile.user_id && profile.user_id.startsWith(authenticatedUserId)) {
        console.log(`  ✅ MATCHES authenticated user!`);
      }
      console.log("");
    });

    // Check which profile belongs to the authenticated user
    const userProfile = profiles.find(p => p.user_id?.startsWith(authenticatedUserId));
    if (userProfile) {
      console.log("🔍 Authenticated user's profile:", userProfile.name);
      console.log("🔍 Role:", userProfile.role);
      console.log("🔍 Has PIN:", !!userProfile.pin_hash);
    } else {
      console.log("❌ No profile found for authenticated user!");
    }

  } catch (error) {
    console.error("❌ Error debugging parent match:", error);
  }
}

if (import.meta.main) {
  await debugParentMatch();
}
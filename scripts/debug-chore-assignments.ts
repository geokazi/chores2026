/**
 * Debug script to check existing chore assignments for Cikũ
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = createClient(supabaseUrl, supabaseServiceKey);

const FAMILY_ID = "445717ba-0841-4b68-994f-eef77bcf4f87";
const CIKU_PROFILE_ID = "2a807f2c-8885-4bb8-aa85-9f2dfed454d9";

async function debugChoreAssignments() {
  console.log("🔍 Debugging chore assignments...");
  console.log("Family ID:", FAMILY_ID);
  console.log("Cikũ Profile ID:", CIKU_PROFILE_ID);

  try {
    // Check what chore assignments exist for this family
    const { data: allAssignments, error: allError } = await client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates(*)
      `)
      .eq("family_id", FAMILY_ID)
      .eq("is_deleted", false);

    if (allError) {
      console.error("Error fetching all assignments:", allError);
      return;
    }

    console.log("\n📋 All chore assignments for this family:");
    console.log(JSON.stringify(allAssignments, null, 2));

    // Check specifically for Cikũ's assignments
    const cikuAssignments = allAssignments?.filter(a => a.assigned_to_profile_id === CIKU_PROFILE_ID);
    console.log(`\n👤 Cikũ's assignments (${cikuAssignments?.length} found):`);
    console.log(JSON.stringify(cikuAssignments, null, 2));

    // Check what our updated query would return
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 3);
    
    const todayStr = today.toISOString();
    const endDateStr = endDate.toISOString();

    console.log(`\n📅 Date range: ${todayStr} to ${endDateStr}`);

    const { data: queryResult, error: queryError } = await client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        *,
        chore_template:chore_templates!inner(*)
      `)
      .eq("family_id", FAMILY_ID)
      .eq("assigned_to_profile_id", CIKU_PROFILE_ID)
      .eq("is_deleted", false)
      .eq("chore_template.is_deleted", false)
      .eq("chore_template.is_active", true)
      .gte("due_date", todayStr)
      .lte("due_date", endDateStr)
      .in("status", ["pending", "assigned"])
      .order("due_date", { ascending: true });

    if (queryError) {
      console.error("Error with updated query:", queryError);
      return;
    }

    console.log(`\n🎯 Updated getTodaysChores query result (${queryResult?.length} found):`);
    console.log(JSON.stringify(queryResult, null, 2));

  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

if (import.meta.main) {
  await debugChoreAssignments();
}
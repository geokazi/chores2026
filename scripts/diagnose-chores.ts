#!/usr/bin/env -S deno run --allow-env --allow-net
/**
 * Diagnose Chores Issue - ChoreGami 2026
 * Investigate why kids aren't seeing any chores
 */

import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.log("❌ Missing Supabase environment variables");
  console.log("   SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
  console.log("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅ Set" : "❌ Missing");
  Deno.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseProblem() {
  console.log("🔍 ChoreGami 2026 - Diagnosing 'No Chores' Issue");
  console.log("=" .repeat(60));

  // Step 1: Check families exist
  console.log("\n📊 Step 1: Checking families...");
  const { data: families, error: familiesError } = await client
    .from("families")
    .select("id, children_pins_enabled, created_at");
  
  if (familiesError) {
    console.log("❌ Error fetching families:", familiesError);
    return;
  }
  
  console.log(`   Found ${families?.length || 0} families`);
  if (!families?.length) {
    console.log("   ⚠️  No families found - need to create a family first");
    return;
  }

  const sampleFamily = families[0];
  console.log(`   Sample family: ${sampleFamily.id.substring(0, 8)}...`);

  // Step 2: Check family profiles (kids and parents)
  console.log("\n👥 Step 2: Checking family members...");
  const { data: profiles, error: profilesError } = await client
    .from("family_profiles")
    .select("id, name, role, family_id, current_points")
    .eq("family_id", sampleFamily.id)
    .eq("is_deleted", false);

  if (profilesError) {
    console.log("❌ Error fetching profiles:", profilesError);
    return;
  }

  console.log(`   Found ${profiles?.length || 0} family members`);
  const kids = profiles?.filter(p => p.role === "child") || [];
  const parents = profiles?.filter(p => p.role === "parent") || [];
  console.log(`   Kids: ${kids.length}, Parents: ${parents.length}`);
  
  if (!kids.length) {
    console.log("   ⚠️  No kids found - need kids to assign chores to");
    return;
  }

  const sampleKid = kids[0];
  console.log(`   Sample kid: ${sampleKid.name} (${sampleKid.id.substring(0, 8)}...)`);

  // Step 3: Check chore templates
  console.log("\n📋 Step 3: Checking chore templates...");
  const { data: templates, error: templatesError } = await client
    .schema("choretracker")
    .from("chore_templates")
    .select("id, name, family_id, points, is_active")
    .eq("family_id", sampleFamily.id)
    .eq("is_deleted", false);

  if (templatesError) {
    console.log("❌ Error fetching templates:", templatesError);
    return;
  }

  console.log(`   Found ${templates?.length || 0} chore templates`);
  if (templates?.length) {
    console.log("   Sample templates:");
    templates.slice(0, 3).forEach(t => {
      console.log(`     - ${t.name} (${t.points} pts, active: ${t.is_active})`);
    });
  } else {
    console.log("   ⚠️  No chore templates found");
  }

  // Step 4: Check chore assignments
  console.log("\n📝 Step 4: Checking chore assignments...");
  const { data: assignments, error: assignmentsError } = await client
    .schema("choretracker")
    .from("chore_assignments")
    .select("id, status, assigned_date, family_id, assigned_to_profile_id, point_value, created_at")
    .eq("family_id", sampleFamily.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    console.log("❌ Error fetching assignments:", assignmentsError);
    return;
  }

  console.log(`   Found ${assignments?.length || 0} total chore assignments`);
  
  if (!assignments?.length) {
    console.log("   🔍 ROOT CAUSE: No chore assignments exist!");
    console.log("   📝 Solution: Need to create chore assignments for kids");
    return;
  }

  // Check date distribution
  const today = new Date().toISOString().split('T')[0];
  const todaysAssignments = assignments.filter(a => a.assigned_date === today);
  
  console.log(`   Assignments for TODAY (${today}): ${todaysAssignments.length}`);
  
  // Show date distribution
  const dateCounts: Record<string, number> = {};
  assignments.forEach(a => {
    const date = a.assigned_date || 'null';
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });
  
  console.log("   Assignment date distribution:");
  Object.entries(dateCounts)
    .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
    .slice(0, 10) // Show top 10 dates
    .forEach(([date, count]) => {
      const isToday = date === today;
      console.log(`     ${isToday ? '👉' : '  '} ${date}: ${count} assignments${isToday ? ' (TODAY)' : ''}`);
    });

  if (todaysAssignments.length === 0) {
    console.log("\n   🔍 ROOT CAUSE: No assignments for today's date!");
    console.log("   📝 Solutions:");
    console.log("     1. Create new assignments for today");
    console.log("     2. Modify getTodaysChores to show pending chores regardless of date");
    console.log("     3. Add parent functionality to assign daily chores");
  }

  // Step 5: Check assignments for sample kid specifically
  console.log(`\n🎯 Step 5: Checking assignments for kid "${sampleKid.name}"...`);
  const kidAssignments = assignments.filter(a => a.assigned_to_profile_id === sampleKid.id);
  const kidTodaysAssignments = kidAssignments.filter(a => a.assigned_date === today);
  
  console.log(`   Total assignments for ${sampleKid.name}: ${kidAssignments.length}`);
  console.log(`   Today's assignments for ${sampleKid.name}: ${kidTodaysAssignments.length}`);

  if (kidAssignments.length > 0 && kidTodaysAssignments.length === 0) {
    console.log("   📅 Kid has assignments, but none for today");
    console.log("   Recent assignments:");
    kidAssignments.slice(0, 5).forEach(a => {
      console.log(`     - ${a.assigned_date}: ${a.point_value} pts (${a.status})`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎯 DIAGNOSIS COMPLETE");
  
  if (todaysAssignments.length === 0) {
    console.log("🔍 ISSUE: No chore assignments for today");
    console.log("💡 RECOMMENDATIONS:");
    console.log("   1. Run create-sample-chores script to add test data");
    console.log("   2. Implement parent chore assignment UI");
    console.log("   3. Consider showing recent pending chores instead of today-only");
  } else {
    console.log("✅ Found assignments for today - issue may be elsewhere");
  }
}

if (import.meta.main) {
  try {
    await diagnoseProblem();
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
    Deno.exit(1);
  }
}
/**
 * Script to create sample chore assignments for testing
 * This will create some basic chore assignments for the current family
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = createClient(supabaseUrl, supabaseServiceKey);

// The family ID we want to create chores for (from the logs)
const FAMILY_ID = "445717ba-0841-4b68-994f-eef77bcf4f87";

async function createSampleChores() {
  console.log("🎯 Creating sample chores for family:", FAMILY_ID);

  try {
    // First, get family members
    const { data: familyMembers, error: membersError } = await client
      .from("family_profiles")
      .select("*")
      .eq("family_id", FAMILY_ID)
      .eq("role", "child");

    if (membersError) {
      console.error("Error fetching family members:", membersError);
      return;
    }

    console.log("👨‍👩‍👧‍👦 Found family members:", familyMembers);

    if (!familyMembers || familyMembers.length === 0) {
      console.log("❌ No children found in this family");
      return;
    }

    // Create some basic chore templates if they don't exist
    const choreTemplates = [
      {
        family_id: FAMILY_ID,
        name: "Load dishwasher",
        description: "Put all dirty dishes in the dishwasher",
        points: 5,
        category: "Kitchen",
        icon: "🍽️",
        is_active: true,
        is_deleted: false,
        is_recurring: false,
      },
      {
        family_id: FAMILY_ID,
        name: "Wipe down counters",
        description: "Clean and wipe down kitchen counters",
        points: 3,
        category: "Kitchen", 
        icon: "🧽",
        is_active: true,
        is_deleted: false,
        is_recurring: false,
      },
      {
        family_id: FAMILY_ID,
        name: "Take out trash",
        description: "Empty trash cans and take to curb",
        points: 4,
        category: "Household",
        icon: "🗑️",
        is_active: true,
        is_deleted: false,
        is_recurring: false,
      },
      {
        family_id: FAMILY_ID,
        name: "Make bed",
        description: "Make your bed neat and tidy",
        points: 2,
        category: "Bedroom",
        icon: "🛏️", 
        is_active: true,
        is_deleted: false,
        is_recurring: false,
      }
    ];

    // Insert chore templates
    const { data: templates, error: templatesError } = await client
      .schema("choretracker")
      .from("chore_templates")
      .upsert(choreTemplates, { onConflict: "family_id,name" })
      .select();

    if (templatesError) {
      console.error("Error creating chore templates:", templatesError);
      return;
    }

    console.log("📋 Created chore templates:", templates);

    // Create assignments for each child
    const assignments = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (const child of familyMembers) {
      // Assign 2 chores to each child - one for today, one for tomorrow
      const childAssignments = [
        {
          family_id: FAMILY_ID,
          chore_template_id: templates[0].id, // Load dishwasher
          assigned_to_profile_id: child.id,
          assigned_date: today.toISOString().split("T")[0],
          due_date: today.toISOString(),
          status: "pending",
          point_value: templates[0].points,
          is_deleted: false,
        },
        {
          family_id: FAMILY_ID,
          chore_template_id: templates[1].id, // Wipe counters
          assigned_to_profile_id: child.id,
          assigned_date: tomorrow.toISOString().split("T")[0],
          due_date: tomorrow.toISOString(),
          status: "pending", 
          point_value: templates[1].points,
          is_deleted: false,
        }
      ];
      assignments.push(...childAssignments);
    }

    // Insert assignments
    const { data: assignmentData, error: assignmentError } = await client
      .schema("choretracker")
      .from("chore_assignments")
      .insert(assignments)
      .select();

    if (assignmentError) {
      console.error("Error creating chore assignments:", assignmentError);
      return;
    }

    console.log("✅ Created chore assignments:", assignmentData);
    console.log(`🎉 Successfully created ${assignmentData.length} chore assignments for ${familyMembers.length} children!`);

  } catch (error) {
    console.error("❌ Error creating sample chores:", error);
  }
}

if (import.meta.main) {
  await createSampleChores();
}
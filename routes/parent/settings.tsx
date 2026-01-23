/**
 * SECURE Parent Settings Page
 * Uses session-based family access (NO family_id in URL)
 *
 * OPTIMIZATION: Uses cached session data for family + members
 * Settings form submission triggers session refresh
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { createClient } from "@supabase/supabase-js";
import { hasRealEmail, resolvePhone } from "../../lib/utils/resolve-phone.ts";
import FamilySettings from "../../islands/FamilySettings.tsx";
import ParentPinGate from "../../islands/ParentPinGate.tsx";
import AppHeader from "../../islands/AppHeader.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface ParentSettingsData {
  family: any;
  members: any[];
  settings: any;
  parentProfileId?: string;
  digestChannel?: "email" | "sms" | null;
  notificationPrefs?: { weekly_summary?: boolean; digest_channel?: string; sms_limit_hit?: boolean };
  error?: string;
}

export const handler: Handlers<ParentSettingsData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    // OPTIMIZATION: Use cached session data (no DB queries needed)
    const { family } = session;

    console.log("✅ Parent settings (cached):", {
      family: family.name,
      memberCount: family.members.length,
      pinsEnabled: family.children_pins_enabled,
      theme: family.theme,
    });

    // Build settings object: flat fields for backwards compat + full JSONB for rotation
    const fullSettings = family.settings || {};

    // Detect digest channel from auth.users (server-side pass-through)
    let digestChannel: "email" | "sms" | null = null;
    let notificationPrefs: any = null;
    const parentProfile = family.members.find((m: any) => m.id === session.user?.profileId) as any;

    if (parentProfile?.user_id) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: { user } } = await supabase.auth.admin.getUserById(parentProfile.user_id);
        if (user) {
          digestChannel = hasRealEmail(user.email) ? "email" : resolvePhone(user) ? "sms" : null;
        }
      } catch (e) {
        console.warn("Failed to detect digest channel:", e);
      }
      notificationPrefs = parentProfile.preferences?.notifications || {};
    }

    return ctx.render({
      family,
      members: family.members,
      settings: {
        // Flat fields for existing component usage
        children_pins_enabled: family.children_pins_enabled,
        theme: family.theme,
        // Include nested JSONB structure for rotation config
        apps: fullSettings.apps,
      },
      parentProfileId: session.user?.profileId,
      digestChannel,
      notificationPrefs,
    });
  },
};

export default function ParentSettingsPage(
  { data }: PageProps<ParentSettingsData>,
) {
  const { family, members, settings, parentProfileId, digestChannel, notificationPrefs, error } = data;
  const currentUser = members.find(m => m.id === parentProfileId) || null;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <div>
            <a href="/parent/dashboard" style={{ color: "white", textDecoration: "none" }}>
              ← Dashboard
            </a>
          </div>
          <h1>Family Settings</h1>
          <div></div>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a href="/parent/dashboard" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/settings.css" />
      </Head>
      <div class="container">
        <AppHeader
          currentPage="settings"
          pageTitle="Family Settings"
          familyMembers={members}
          currentUser={currentUser}
          userRole="parent"
        />

      <ParentPinGate
        operation="access family settings"
        familyMembers={members}
      >
        <FamilySettings
          family={family}
          members={members}
          settings={settings}
          digestChannel={digestChannel}
          notificationPrefs={notificationPrefs}
        />
      </ParentPinGate>
        <AppFooter />
      </div>
    </>
  );
}
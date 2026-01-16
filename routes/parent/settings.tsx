/**
 * SECURE Parent Settings Page
 * Uses session-based family access (NO family_id in URL)
 *
 * OPTIMIZATION: Uses cached session data for family + members
 * Settings form submission triggers session refresh
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import FamilySettings from "../../islands/FamilySettings.tsx";
import AppFooter from "../../components/AppFooter.tsx";

interface ParentSettingsData {
  family: any;
  members: any[];
  settings: any;
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
    });
  },
};

export default function ParentSettingsPage(
  { data }: PageProps<ParentSettingsData>,
) {
  const { family, members, settings, error } = data;

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

      <FamilySettings
        family={family}
        members={members}
        settings={settings}
      />
      <AppFooter />
    </div>
  );
}
/**
 * SECURE Parent Settings Page
 * Uses session-based family access (NO family_id in URL)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { ChoreService } from "../../lib/services/chore-service.ts";
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
    // SECURITY: Get family_id from authenticated session, not URL
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }

    const familyId = session.family.id;

    try {
      const choreService = new ChoreService();

      // Get family members
      const members = await choreService.getFamilyMembers(familyId);

      // Get family settings (PIN enabled, themes, etc.)
      const settings = await choreService.getFamilySettings(familyId);
      
      // Get fresh family data with current PIN setting
      const family = await choreService.getFamily(familyId);

      console.log("✅ Parent settings loaded for family:", family?.name || session.family.name, {
        familyPinsEnabled: family?.children_pins_enabled,
        settingsData: settings
      });

      return ctx.render({
        family: family || session.family,
        members,
        settings: settings || { children_pins_enabled: false, theme: "fresh_meadow" },
      });
    } catch (error) {
      console.error("❌ Error loading parent settings:", error);
      return ctx.render({
        family: session.family,
        members: [],
        settings: { children_pins_enabled: false, theme: "fresh_meadow" },
        error: "Failed to load settings",
      });
    }
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
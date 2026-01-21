/**
 * FamilySettings - Orchestrator for all settings sections
 *
 * Sections are ordered for first-time user flow:
 * 1. Family Members - Add kids first (critical for first-time users)
 * 2. Chore Rotation Templates - Core functionality (requires kids)
 * 3. Point Management - Regular adjustments
 * 4. Weekly Family Goal - Occasional updates
 * 5. App Theme - Personalization
 * 6. Kid Event Creation - Teen autonomy with oversight
 * 7. Kid PIN Security - One-time setup
 * 8. Parent PIN Security - One-time setup
 */

import { useState } from "preact/hooks";
import TemplateSelector from "./TemplateSelector.tsx";
import FamilyMembersSection from "./settings/FamilyMembersSection.tsx";
import PointManagementSection from "./settings/PointManagementSection.tsx";
import WeeklyGoalSection from "./settings/WeeklyGoalSection.tsx";
import ThemeSection from "./settings/ThemeSection.tsx";
import KidPinSection from "./settings/KidPinSection.tsx";
import ParentPinSection from "./settings/ParentPinSection.tsx";
import PinSetupModal from "./settings/PinSetupModal.tsx";

interface FamilySettingsProps {
  family: {
    id: string;
    name: string;
    children_pins_enabled?: boolean;
    settings?: any;
  };
  members: Array<{
    id: string;
    name: string;
    role: string;
    current_points: number;
    has_pin?: boolean;
  }>;
  settings: {
    children_pins_enabled?: boolean;
    theme?: string;
    weekly_goal?: number;
    goal_bonus?: number;
    apps?: any;
  };
}

export default function FamilySettings({ family, members, settings }: FamilySettingsProps) {
  // Shared PIN modal state - lifted to orchestrator level
  const [pinModalMember, setPinModalMember] = useState<{ id: string; name: string; role: string } | null>(null);

  // Kid event creation toggle state
  const [kidsCanCreateEvents, setKidsCanCreateEvents] = useState(
    settings?.apps?.choregami?.kids_can_create_events ?? false
  );
  const [savingEventSetting, setSavingEventSetting] = useState(false);

  const childMembers = members.filter(m => m.role === "child");
  const parentMembers = members.filter(m => m.role === "parent");

  const handleRemoveRotation = async () => {
    const response = await fetch('/api/rotation/apply', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to remove rotation');
  };

  const handleKidsEventToggle = async () => {
    const newValue = !kidsCanCreateEvents;
    setSavingEventSetting(true);

    try {
      const response = await fetch('/api/settings/kids-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });

      if (response.ok) {
        setKidsCanCreateEvents(newValue);
      } else {
        console.error('Failed to save kid events setting');
        alert('Failed to save setting. Please try again.');
      }
    } catch (error) {
      console.error('Error saving kid events setting:', error);
      alert('Failed to save setting. Please try again.');
    } finally {
      setSavingEventSetting(false);
    }
  };

  const handlePinSaved = () => {
    // Refresh the page to show updated PIN status
    globalThis.location.reload();
  };

  return (
    <div class="settings-container">
      {/* 1. First-time setup - Family Members (add kids first!) */}
      <FamilyMembersSection members={members} />

      {/* 2. Core functionality - Chore Rotation Templates */}
      <TemplateSelector
        settings={settings}
        children={childMembers}
        onRemoveRotation={handleRemoveRotation}
      />

      {/* 3. Regular use - Point Management */}
      <PointManagementSection members={members} familyId={family.id} />

      {/* 4. Occasional - Weekly Family Goal */}
      <WeeklyGoalSection settings={settings} />

      {/* 5. Personalization - App Theme */}
      <ThemeSection />

      {/* 6. Teen autonomy - Kid Event Creation */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📅</span>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>Event Creation</h3>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem",
          backgroundColor: "var(--color-bg)",
          borderRadius: "0.5rem",
        }}>
          <div>
            <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
              Kids can create events
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
              {kidsCanCreateEvents
                ? "✅ Kids can add their own activities"
                : "🔒 Only parents can create events"}
            </div>
          </div>
          <button
            onClick={handleKidsEventToggle}
            disabled={savingEventSetting}
            style={{
              width: "50px",
              height: "28px",
              borderRadius: "14px",
              border: "none",
              backgroundColor: kidsCanCreateEvents ? "var(--color-primary)" : "#ccc",
              cursor: savingEventSetting ? "not-allowed" : "pointer",
              position: "relative",
              transition: "background-color 0.2s",
              opacity: savingEventSetting ? 0.7 : 1,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "white",
                position: "absolute",
                top: "2px",
                left: kidsCanCreateEvents ? "24px" : "2px",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        {kidsCanCreateEvents && (
          <div style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            backgroundColor: "#f0f9ff",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--color-text)",
          }}>
            <strong>How it works:</strong>
            <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
              <li>Kids see "+ Add" button in Coming Up section</li>
              <li>If Kid PIN is enabled, PIN required before creating</li>
              <li>Parents see all events with "Added by" attribution</li>
            </ul>
          </div>
        )}
      </div>

      {/* 7. One-time setup - Kid PIN Security */}
      <KidPinSection
        family={family}
        members={childMembers}
        onSetPin={(member) => setPinModalMember(member)}
      />

      {/* 8. One-time setup - Parent PIN Security */}
      <ParentPinSection
        members={parentMembers}
        onSetPin={(member) => setPinModalMember(member)}
      />

      {/* Shared PIN Setup Modal */}
      <PinSetupModal
        isOpen={!!pinModalMember}
        member={pinModalMember}
        onClose={() => setPinModalMember(null)}
        onSaved={handlePinSaved}
      />
    </div>
  );
}

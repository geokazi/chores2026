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
  digestChannel?: "email" | "sms" | null;
  notificationPrefs?: { weekly_summary?: boolean; digest_channel?: string; sms_limit_hit?: boolean };
}

export default function FamilySettings({ family, members, settings, digestChannel, notificationPrefs }: FamilySettingsProps) {
  // Shared PIN modal state - lifted to orchestrator level
  const [pinModalMember, setPinModalMember] = useState<{ id: string; name: string; role: string } | null>(null);

  // Notification preferences state
  const [weeklyDigest, setWeeklyDigest] = useState(notificationPrefs?.weekly_summary ?? false);
  const [savingDigest, setSavingDigest] = useState(false);
  const smsLimitHit = notificationPrefs?.sms_limit_hit ?? false;

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

  const handleDigestToggle = async () => {
    const newValue = !weeklyDigest;
    setSavingDigest(true);

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_summary: newValue,
          digest_channel: digestChannel || "email",
        }),
      });

      if (response.ok) {
        setWeeklyDigest(newValue);
      } else {
        alert('Failed to save notification setting. Please try again.');
      }
    } catch (error) {
      console.error('Error saving notification setting:', error);
      alert('Failed to save setting. Please try again.');
    } finally {
      setSavingDigest(false);
    }
  };

  const handleSwitchToEmail = async () => {
    setSavingDigest(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_summary: true,
          digest_channel: "email",
          sms_limit_hit: false,
        }),
      });
      if (response.ok) {
        globalThis.location.reload();
      }
    } catch (error) {
      console.error('Error switching to email:', error);
    } finally {
      setSavingDigest(false);
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

      {/* 7. Notifications - Weekly Digest */}
      {digestChannel && (
        <div class="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📧</span>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>Notifications</h3>
          </div>

          {/* SMS limit hit banner */}
          {smsLimitHit && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#fef3c7",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Switched to Email Digest</div>
              <div style={{ color: "#92400e", marginBottom: "0.5rem" }}>
                You've used 4/4 SMS digests this month. We're sending via email instead.
              </div>
              <button
                onClick={handleSwitchToEmail}
                disabled={savingDigest}
                style={{
                  padding: "0.375rem 0.75rem",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: "500",
                }}
              >
                Keep using email (free & unlimited)
              </button>
            </div>
          )}

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
                Weekly digest via {digestChannel}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                {weeklyDigest
                  ? `✅ Sends to your registered ${digestChannel === "email" ? "email" : "phone"}`
                  : `Upcoming events, chore stats, and family highlights`}
              </div>
            </div>
            <button
              onClick={handleDigestToggle}
              disabled={savingDigest}
              style={{
                width: "50px",
                height: "28px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: weeklyDigest ? "var(--color-primary)" : "#ccc",
                cursor: savingDigest ? "not-allowed" : "pointer",
                position: "relative",
                transition: "background-color 0.2s",
                opacity: savingDigest ? 0.7 : 1,
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
                  left: weeklyDigest ? "24px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          {weeklyDigest && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#f0f9ff",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--color-text)",
            }}>
              Includes upcoming events, chore stats, streaks, and family highlights. Sent Sunday mornings.
            </div>
          )}
        </div>
      )}

      {/* 8. One-time setup - Kid PIN Security */}
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

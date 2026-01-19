/**
 * FamilySettings - Orchestrator for all settings sections
 *
 * Sections are ordered by usage frequency:
 * 1. Chore Rotation Templates - Core functionality
 * 2. Family Members - Frequent management
 * 3. Point Management - Regular adjustments
 * 4. Weekly Family Goal - Occasional updates
 * 5. App Theme - Personalization
 * 6. Kid PIN Security - One-time setup
 * 7. Parent PIN Security - One-time setup
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

  const childMembers = members.filter(m => m.role === "child");
  const parentMembers = members.filter(m => m.role === "parent");

  const handleRemoveRotation = async () => {
    const response = await fetch('/api/rotation/apply', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to remove rotation');
  };

  const handlePinSaved = () => {
    // Refresh the page to show updated PIN status
    globalThis.location.reload();
  };

  return (
    <div class="settings-container">
      {/* 1. Most used - Chore Rotation Templates */}
      <TemplateSelector
        settings={settings}
        children={childMembers}
        onRemoveRotation={handleRemoveRotation}
      />

      {/* 2. Frequently used - Family Members */}
      <FamilyMembersSection members={members} />

      {/* 3. Regular use - Point Management */}
      <PointManagementSection members={members} familyId={family.id} />

      {/* 4. Occasional - Weekly Family Goal */}
      <WeeklyGoalSection settings={settings} />

      {/* 5. Personalization - App Theme */}
      <ThemeSection />

      {/* 6. One-time setup - Kid PIN Security */}
      <KidPinSection
        family={family}
        members={childMembers}
        onSetPin={(member) => setPinModalMember(member)}
      />

      {/* 7. One-time setup - Parent PIN Security */}
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

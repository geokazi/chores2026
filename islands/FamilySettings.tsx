/**
 * Family Settings - PIN management, theme selection, and chore rotation
 */

import { useState, useEffect } from "preact/hooks";
import ParentPinGate from "./ParentPinGate.tsx";
import { getCurrentTheme, changeTheme, themes, type ThemeId } from "../lib/theme-manager.ts";
import { ROTATION_PRESETS, getPresetByKey, getPresetSlots } from "../lib/data/rotation-presets.ts";
import { getRotationConfig, getChoresWithCustomizations } from "../lib/services/rotation-service.ts";
import type { RotationPreset, ChildSlotMapping, RotationCustomizations, CustomChore } from "../lib/types/rotation.ts";

interface FamilySettingsProps {
  family: any;
  members: any[];
  settings: any;
}

export default function FamilySettings({ family, members, settings }: FamilySettingsProps) {
  // Debug logging
  console.log("🔧 FamilySettings component data:", {
    family,
    familyPinsEnabled: family?.children_pins_enabled,
    settings,
    settingsPinsEnabled: settings.children_pins_enabled,
    membersCount: members?.length
  });

  // Use family.children_pins_enabled as the primary source
  const initialState = family?.children_pins_enabled || settings.children_pins_enabled || false;
  console.log("🔧 Initial toggle state:", initialState);
  
  // Store/retrieve from localStorage for debugging
  const localStorageKey = `family_pins_enabled_${family?.id}`;
  const localState = typeof window !== 'undefined' ? localStorage.getItem(localStorageKey) : null;
  console.log("🔧 LocalStorage state:", localState);
  
  const [pinsEnabled, setPinsEnabled] = useState(initialState);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => {
    return getCurrentTheme();
  });
  const [isUpdatingPins, setIsUpdatingPins] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentKid, setCurrentKid] = useState<{id: string, name: string} | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);
  
  // Point adjustment modal state
  const [showPointAdjustment, setShowPointAdjustment] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Weekly goal settings
  const [weeklyGoal, setWeeklyGoal] = useState<string>(
    settings?.weekly_goal?.toString() || ""
  );
  const [goalBonus, setGoalBonus] = useState<string>(
    settings?.goal_bonus?.toString() || "2"
  );
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Rotation template state
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [childSlots, setChildSlots] = useState<Record<string, string>>({});
  const [isApplyingRotation, setIsApplyingRotation] = useState(false);
  const activeRotation = getRotationConfig(settings || {});

  // Template customization state
  const [showCustomize, setShowCustomize] = useState(false);
  const [choreOverrides, setChoreOverrides] = useState<Record<string, { points?: number; enabled?: boolean }>>({});
  const [customChores, setCustomChores] = useState<CustomChore[]>([]);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChorePoints, setNewChorePoints] = useState("1");
  const [isSavingCustomizations, setIsSavingCustomizations] = useState(false);

  // Initialize customization state from active rotation
  useEffect(() => {
    if (activeRotation?.customizations) {
      setChoreOverrides(activeRotation.customizations.chore_overrides || {});
      setCustomChores(activeRotation.customizations.custom_chores || []);
    }
  }, [activeRotation?.active_preset]);

  const children = members.filter(member => member.role === "child");

  // Apply theme on component mount
  useEffect(() => {
    changeTheme(selectedTheme);
  }, []);

  const handleSetPin = (kidId: string, kidName: string) => {
    setCurrentKid({ id: kidId, name: kidName });
    setPinEntry("");
    setShowPinModal(true);
    console.log('🔧 PARENT PIN SETTING modal opened for:', kidName, '- This is for SETTING new PINs');
  };

  const handleSetParentPin = (parentId: string, parentName: string) => {
    // Use the same modal but for parent PIN setup
    setCurrentKid({ id: parentId, name: parentName });
    setPinEntry("");
    setShowPinModal(true);
    console.log('🔐 PARENT PIN SETUP modal opened for:', parentName);
  };

  const savePinForKid = async (kidId: string, pin: string): Promise<boolean> => {
    try {
      // Determine if this is a parent or kid
      const member = members.find(m => m.id === kidId);
      const isParent = member?.role === 'parent';
      
      console.log(`🔧 Saving PIN for ${isParent ? 'parent' : 'kid'} ${kidId}:`, pin.replace(/./g, '*'));
      
      if (isParent) {
        // For parents, use plaintext storage for instant verification (no bcrypt issues)
        console.log(`🔐 Storing plaintext PIN for parent ${member.name} (fast verification)`);
        
        // Store as plaintext in database using simple API
        const response = await fetch(`/api/parent/setup-pin-simple`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: kidId, pin: pin }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`🔧 Parent PIN API error: ${errorText}`);
          return false;
        }

        const result = await response.json();
        console.log('✅ Parent PIN saved successfully:', result);
        
        // Update local members data with plaintext PIN for immediate verification
        const updatedMembers = members.map(m => 
          m.id === kidId && m.role === 'parent' 
            ? { ...m, pin_hash: pin }
            : m
        );
        console.log('🔧 Updated local member data with new PIN');
        
        return result.success || false;
      } else {
        // For kids, use existing API
        const response = await fetch('/api/family/set-kid-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kid_id: kidId, pin: pin }),
        });

        console.log(`🔧 PIN API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`🔧 PIN API error: ${errorText}`);
          return false;
        }

        const result = await response.json();
        console.log('✅ Kid PIN saved successfully:', result);
        return result.success || false;
      }
    } catch (error) {
      console.error('❌ Error saving PIN:', error);
      return false;
    }
  };

  const handleMemberPointAdjustment = (member: any) => {
    setSelectedMember(member);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setShowPointAdjustment(true);
  };

  const handlePointAdjustment = async () => {
    if (!selectedMember || !adjustmentAmount || !adjustmentReason) {
      return;
    }

    const beforePoints = selectedMember.current_points;
    const adjustAmount = parseInt(adjustmentAmount);

    try {
      const response = await fetch(`/api/points/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMember.id,
          family_id: family.id,
          amount: adjustAmount,
          reason: adjustmentReason,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const afterPoints = result.new_balance;
        const sign = adjustAmount >= 0 ? "+" : "";

        // Show toast notification
        alert(`✅ Points adjusted for ${selectedMember.name}!\n\nBefore: ${beforePoints} pts\nAdjustment: ${sign}${adjustAmount} pts\nAfter: ${afterPoints} pts\n\nReason: ${adjustmentReason}`);

        console.log("✅ Points adjusted successfully:", {
          member: selectedMember.name,
          before: beforePoints,
          adjustment: adjustAmount,
          after: afterPoints,
        });

        setShowPointAdjustment(false);
        setSelectedMember(null);
        setAdjustmentAmount("");
        setAdjustmentReason("");
        window.location.reload();
      } else {
        const errorMsg = result.details || result.error || "Unknown error";
        alert(`❌ Failed to adjust points: ${errorMsg}`);
        console.error("❌ Failed to adjust points:", result);
      }
    } catch (error) {
      alert(`❌ Error adjusting points: ${error}`);
      console.error("❌ Error adjusting points:", error);
    }
  };

  const handleThemeChange = (themeId: ThemeId) => {
    console.log('🎨 Changing theme to:', themeId);

    // Update state
    setSelectedTheme(themeId);

    // Apply theme using theme manager
    changeTheme(themeId);

    console.log('✅ Theme applied and saved:', themeId);
  };

  const openRotationModal = () => {
    setSelectedPreset(activeRotation?.active_preset || "");
    // Pre-fill existing mappings if editing
    if (activeRotation?.child_slots) {
      const existing: Record<string, string> = {};
      activeRotation.child_slots.forEach(s => { existing[s.slot] = s.profile_id; });
      setChildSlots(existing);
    } else {
      setChildSlots({});
    }
    setShowRotationModal(true);
  };

  const handleApplyRotation = async () => {
    if (!selectedPreset) return;
    const preset = getPresetByKey(selectedPreset);
    if (!preset) return;

    const slots = getPresetSlots(preset);
    const mappings: ChildSlotMapping[] = slots.map(slot => ({
      slot,
      profile_id: childSlots[slot] || "",
    }));

    // Validate all slots are filled
    if (mappings.some(m => !m.profile_id)) {
      alert("Please assign a child to each slot");
      return;
    }

    // Validate no duplicate children
    const profileIds = mappings.map(m => m.profile_id);
    const uniqueIds = new Set(profileIds);
    if (uniqueIds.size !== profileIds.length) {
      alert("Each slot must have a different child assigned");
      return;
    }

    setIsApplyingRotation(true);
    try {
      const response = await fetch('/api/rotation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_key: selectedPreset, child_slots: mappings }),
      });

      if (response.ok) {
        alert(`✅ ${preset.name} template activated!`);
        setShowRotationModal(false);
        globalThis.location.reload();
      } else {
        const result = await response.json();
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
    setIsApplyingRotation(false);
  };

  const handleRemoveRotation = async () => {
    // If no active rotation, nothing to remove
    if (!activeRotation) return;

    try {
      const response = await fetch('/api/rotation/apply', { method: 'DELETE' });
      if (response.ok) {
        globalThis.location.reload();
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
  };

  const handleAddCustomChore = () => {
    if (!newChoreName.trim()) return;
    const key = `custom_${Date.now()}`;
    const newChore: CustomChore = {
      key,
      name: newChoreName.trim(),
      points: parseInt(newChorePoints) || 1,
    };
    setCustomChores([...customChores, newChore]);
    setNewChoreName("");
    setNewChorePoints("1");
  };

  const handleRemoveCustomChore = (key: string) => {
    setCustomChores(customChores.filter(c => c.key !== key));
  };

  const handleSaveCustomizations = async () => {
    if (!activeRotation) return;
    setIsSavingCustomizations(true);

    const customizations: RotationCustomizations = {};
    if (Object.keys(choreOverrides).length > 0) {
      customizations.chore_overrides = choreOverrides;
    }
    if (customChores.length > 0) {
      customizations.custom_chores = customChores;
    }

    try {
      const response = await fetch('/api/rotation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_key: activeRotation.active_preset,
          child_slots: activeRotation.child_slots,
          customizations: Object.keys(customizations).length > 0 ? customizations : null,
          start_date: activeRotation.start_date,
        }),
      });

      if (response.ok) {
        alert('✅ Customizations saved!');
        globalThis.location.reload();
      } else {
        const result = await response.json();
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
    setIsSavingCustomizations(false);
  };

  const handleResetCustomizations = () => {
    if (!activeRotation?.customizations) return;
    if (confirm('Reset all customizations to template defaults?')) {
      setChoreOverrides({});
      setCustomChores([]);
    }
  };

  return (
    <div class="settings-container">
      <div class="settings-section">
        <h2>🔐 Kid PIN Security</h2>
        <div class="setting-item">
          <div class="setting-info">
            <h3>Kid PIN Entry</h3>
            <p>{pinsEnabled ? '🔒 Kids need PINs to access dashboard' : '🔓 Kids can access dashboard directly'}</p>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={pinsEnabled}
              onChange={async (e) => {
                const newState = e.currentTarget.checked;
                console.log(`🔧 Checkbox toggled - old: ${pinsEnabled}, new: ${newState}`);
                
                setIsUpdatingPins(true);
                const success = await updatePinSetting(newState);
                
                if (success) {
                  setPinsEnabled(newState);
                  // Update localStorage on success
                  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
                    globalThis.localStorage.setItem(localStorageKey, String(newState));
                    console.log(`🔧 Updated localStorage: ${newState}`);
                  }
                } else {
                  console.log(`🔧 Failed to update, keeping old state: ${pinsEnabled}`);
                  // Force checkbox back to current state
                  e.currentTarget.checked = pinsEnabled;
                }
                
                setIsUpdatingPins(false);
              }}
              disabled={isUpdatingPins}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        {pinsEnabled && children.length > 0 && (
          <div class="pin-management">
            <h4>Manage Kid PINs</h4>
            {children.map((child) => (
              <div key={child.id} class="pin-child-item">
                <span class="child-name">{child.name}</span>
                <button 
                  type="button"
                  class="btn-secondary"
                  onClick={() => handleSetPin(child.id, child.name)}
                >
                  {child.pin_hash ? 'Change PIN' : 'Set PIN'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="settings-section">
        <h2>🎨 App Theme</h2>
        <div class="theme-selector">
          {themes.map((theme) => (
            <div 
              key={theme.id}
              class={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
              onClick={() => {
                handleThemeChange(theme.id);
              }}
            >
              <div 
                class="theme-color" 
                style={{ backgroundColor: theme.color }}
              ></div>
              <span class="theme-name">{theme.name}</span>
              {selectedTheme === theme.id && <span class="theme-check">✓</span>}
            </div>
          ))}
        </div>
      </div>

      <div class="settings-section">
        <h2>🎯 Weekly Family Goal</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
          Set a weekly earnings goal. When reached, everyone gets a bonus!
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ minWidth: "60px", fontWeight: "500" }}>Goal</label>
            <span>$</span>
            <input
              type="number"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(e.currentTarget.value)}
              placeholder="20"
              min="1"
              max="1000"
              style={{
                width: "80px",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "2px solid #e5e7eb",
                fontSize: "1rem"
              }}
            />
            <span style={{ color: "var(--color-text-light)" }}>/week</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ minWidth: "60px", fontWeight: "500" }}>Bonus</label>
            <span>$</span>
            <input
              type="number"
              value={goalBonus}
              onChange={(e) => setGoalBonus(e.currentTarget.value)}
              placeholder="2"
              min="0"
              max="100"
              style={{
                width: "80px",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "2px solid #e5e7eb",
                fontSize: "1rem"
              }}
            />
            <span style={{ color: "var(--color-text-light)" }}>per person</span>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--color-text-light)", margin: 0 }}>
            Leave goal blank to disable. When goal is reached, everyone gets the bonus!
          </p>

          <button
            class="btn btn-primary"
            style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            onClick={async () => {
              setIsSavingGoal(true);
              try {
                const response = await fetch('/api/family/goal-settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    weekly_goal: weeklyGoal ? parseInt(weeklyGoal) : null,
                    goal_bonus: parseInt(goalBonus) || 2,
                  }),
                });

                if (response.ok) {
                  alert('✅ Goal settings saved!');
                } else {
                  const result = await response.json();
                  alert(`❌ Failed to save: ${result.error}`);
                }
              } catch (error) {
                alert(`❌ Error: ${error}`);
              }
              setIsSavingGoal(false);
            }}
            disabled={isSavingGoal}
          >
            {isSavingGoal ? 'Saving...' : 'Save Goal Settings'}
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h2>📋 Chore Assignment Mode</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
          Choose how chores are assigned to kids
        </p>

        <div class="rotation-presets">
          {/* Manual (Default) Option */}
          <label
            class={`rotation-preset-option ${!activeRotation ? 'selected' : ''}`}
            style={{ borderLeft: '4px solid #6b7280' }}
          >
            <input
              type="radio"
              name="assignment-mode"
              value="manual"
              checked={!activeRotation}
              onChange={handleRemoveRotation}
            />
            <span class="preset-icon">📝</span>
            <div class="preset-info">
              <strong>Manual (Default)</strong>
              <p>You create and assign chores yourself</p>
              <a
                href="/parent/dashboard"
                class="manage-chores-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Dashboard →
              </a>
            </div>
          </label>

          {/* Template Options */}
          {ROTATION_PRESETS.filter(p => children.length >= p.min_children && children.length <= p.max_children).map((preset) => (
            <label
              key={preset.key}
              class={`rotation-preset-option ${activeRotation?.active_preset === preset.key ? 'selected' : ''}`}
              style={{ borderLeft: `4px solid ${preset.color || '#ccc'}` }}
            >
              <input
                type="radio"
                name="assignment-mode"
                value={preset.key}
                checked={activeRotation?.active_preset === preset.key}
                onChange={() => {
                  setSelectedPreset(preset.key);
                  setChildSlots({});
                  setShowRotationModal(true);
                }}
              />
              <span class="preset-icon">{preset.icon}</span>
              <div class="preset-info">
                <strong>{preset.name}</strong>
                <p>{preset.description}</p>
              </div>
            </label>
          ))}
        </div>

        {activeRotation && (
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginTop: "0.5rem" }}>
            Started {activeRotation.start_date}
          </p>
        )}

        {/* Inline Customization Section */}
        {activeRotation && (
          <div class="customize-section">
            <button
              class="btn btn-outline"
              onClick={() => setShowCustomize(!showCustomize)}
              style={{ marginTop: "1rem", width: "100%" }}
            >
              {showCustomize ? '▼ Hide Customization' : '▶ Customize Template'}
            </button>

            {showCustomize && (() => {
              const preset = getPresetByKey(activeRotation.active_preset);
              if (!preset) return null;

              return (
                <div class="customize-content">
                  <h4>Template Chores</h4>
                  <div class="chore-customize-list">
                    {preset.chores.map((chore) => {
                      const override = choreOverrides[chore.key] || {};
                      const isEnabled = override.enabled !== false;
                      const points = override.points ?? chore.points;

                      return (
                        <div key={chore.key} class={`chore-customize-row ${!isEnabled ? 'disabled' : ''}`}>
                          <label class="chore-enable">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                setChoreOverrides({
                                  ...choreOverrides,
                                  [chore.key]: { ...override, enabled: e.currentTarget.checked },
                                });
                              }}
                            />
                            <span class="chore-icon">{chore.icon}</span>
                            <span class="chore-name">{chore.name}</span>
                          </label>
                          <select
                            value={points}
                            onChange={(e) => {
                              setChoreOverrides({
                                ...choreOverrides,
                                [chore.key]: { ...override, points: parseInt(e.currentTarget.value) },
                              });
                            }}
                            disabled={!isEnabled}
                            class="chore-points-select"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                              <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <h4 style={{ marginTop: "1.5rem" }}>Custom Chores</h4>
                  <div class="custom-chores-list">
                    {customChores.map((chore) => (
                      <div key={chore.key} class="chore-customize-row">
                        <span class="chore-icon">{chore.icon || '✨'}</span>
                        <span class="chore-name">{chore.name}</span>
                        <span class="chore-points">{chore.points} pt{chore.points > 1 ? 's' : ''}</span>
                        <button
                          class="btn-remove"
                          onClick={() => handleRemoveCustomChore(chore.key)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <div class="add-chore-row">
                      <input
                        type="text"
                        value={newChoreName}
                        onChange={(e) => setNewChoreName(e.currentTarget.value)}
                        placeholder="Chore name"
                        class="add-chore-input"
                      />
                      <select
                        value={newChorePoints}
                        onChange={(e) => setNewChorePoints(e.currentTarget.value)}
                        class="chore-points-select"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                          <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                      <button
                        class="btn btn-outline"
                        onClick={handleAddCustomChore}
                        disabled={!newChoreName.trim()}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div class="customize-actions">
                    <button
                      class="btn btn-primary"
                      onClick={handleSaveCustomizations}
                      disabled={isSavingCustomizations}
                    >
                      {isSavingCustomizations ? 'Saving...' : 'Save Changes'}
                    </button>
                    {(Object.keys(choreOverrides).length > 0 || customChores.length > 0) && (
                      <button
                        class="btn btn-outline"
                        onClick={handleResetCustomizations}
                        disabled={isSavingCustomizations}
                      >
                        Reset to Defaults
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div class="settings-section">
        <h2>👨‍👩‍👧‍👦 Family Members</h2>
        <div class="members-list">
          {members.map((member) => (
            <div key={member.id} class="member-item">
              <div class="member-info">
                <span class="member-name">{member.name}</span>
                <span class={`member-role ${member.role}`}>
                  {member.role === 'parent' ? '👨‍👩‍👧‍👦 Parent' : '🧒 Kid'}
                </span>
              </div>
              <div class="member-stats">
                <span class="points">{member.current_points || 0} points</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="settings-section">
        <h2>🔐 Parent PIN Security</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
          Set a 4-digit PIN to protect point adjustments and family settings
        </p>
        
        {members.filter(member => member.role === 'parent').map((parent) => (
          <div key={parent.id} class="member-item">
            <div class="member-info">
              <span class="member-name">{parent.name}</span>
              <span class="member-role parent">👨‍👩‍👧‍👦 Parent</span>
            </div>
            <div class="member-actions">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button 
                  class="btn btn-outline" 
                  onClick={() => handleSetParentPin(parent.id, parent.name)}
                  style={{ fontSize: "0.75rem" }}
                >
                  {parent.pin_hash ? "Change PIN" : "Set PIN"}
                </button>
                {parent.pin_hash === "1234" && (
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "var(--color-warning)",
                    fontWeight: "500"
                  }}>
                    ⚠️ Using default PIN (change required)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="settings-section">
        <h2>⚡ Point Management</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
          Adjust family member points with quick presets or custom amounts
        </p>
        
        <ParentPinGate 
          operation="adjust family points"
          familyMembers={members}
        >
          <div class="point-management">
            {members.map((member) => (
              <div key={member.id} class="member-item">
                <div class="member-info">
                  <span class="member-name">{member.name}</span>
                  <span class={`member-role ${member.role}`}>
                    {member.role === 'parent' ? '👨‍👩‍👧‍👦 Parent' : '🧒 Kid'}
                  </span>
                  <span class="member-points">{member.current_points} points</span>
                </div>
                <div class="member-actions">
                  <button 
                    class="btn btn-outline" 
                    onClick={() => handleMemberPointAdjustment(member)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    ⚡ Adjust Points
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ParentPinGate>
      </div>

      <div class="settings-section">
        <h2>⚠️ Danger Zone</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-warning)", marginBottom: "1rem" }}>
          These actions require parent PIN verification and cannot be undone
        </p>
        <div class="danger-actions">
          <ParentPinGate 
            operation="reset all family points"
            familyMembers={members}
          >
            <button class="btn-danger" onClick={handleResetAllPoints}>
              Reset All Points
            </button>
          </ParentPinGate>
          <ParentPinGate 
            operation="clear all kid PINs"
            familyMembers={members}
          >
            <button class="btn-danger" onClick={handleClearAllPins}>
              Clear All Kid PINs
            </button>
          </ParentPinGate>
        </div>
      </div>

      {/* PIN Setting Modal */}
      {showPinModal && currentKid && (
        <div class="pin-modal-overlay">
          <div class="pin-modal">
            <h3>👶 {currentKid.name}'s PIN</h3>
            <p>Choose 4 numbers you'll remember</p>
            
            <div class="pin-display">
              {[0, 1, 2, 3].map(i => (
                <div key={i} class={`pin-circle ${pinEntry.length > i ? 'filled' : ''}`}>
                  {pinEntry.length > i ? '●' : ''}
                </div>
              ))}
            </div>
            
            <div class="pin-status">
              {pinEntry.length === 4 && isSettingPin ? 'Validating...' : 
               pinEntry.length === 4 ? 'Ready to save!' : 
               `${pinEntry.length}/4 digits`}
            </div>

            <div class="pin-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  class="pin-key"
                  onClick={() => {
                    if (pinEntry.length < 4 && !isSettingPin) {
                      setPinEntry(pinEntry + num);
                    }
                  }}
                  disabled={pinEntry.length >= 4 || isSettingPin}
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                class="pin-key backspace"
                onClick={() => {
                  if (pinEntry.length > 0 && !isSettingPin) {
                    setPinEntry(pinEntry.slice(0, -1));
                  }
                }}
                disabled={pinEntry.length === 0 || isSettingPin}
              >
                ←
              </button>
              
              <button
                type="button"
                class="pin-key"
                onClick={() => {
                  if (pinEntry.length < 4 && !isSettingPin) {
                    setPinEntry(pinEntry + "0");
                  }
                }}
                disabled={pinEntry.length >= 4 || isSettingPin}
              >
                0
              </button>
              
              <button
                type="button"
                class="pin-key confirm"
                onClick={async () => {
                  if (pinEntry.length === 4) {
                    setIsSettingPin(true);
                    console.log(`🔧 Saving PIN for ${currentKid.name} with PIN: ${pinEntry.replace(/./g, '*')}`);
                    
                    const success = await savePinForKid(currentKid.id, pinEntry);
                    console.log(`🔧 PIN save result: ${success}`);
                    setIsSettingPin(false);
                    
                    if (success) {
                      setShowPinModal(false);
                      setCurrentKid(null);
                      setPinEntry("");
                      // Refresh the page to show updated PIN status
                      globalThis.location.reload();
                    } else {
                      // Clear PIN on error and let user try again
                      setPinEntry("");
                    }
                  }
                }}
                disabled={pinEntry.length !== 4 || isSettingPin}
              >
                ✓
              </button>
            </div>

            <button 
              type="button"
              class="pin-cancel" 
              onClick={() => {
                setShowPinModal(false);
                setCurrentKid(null);
                setPinEntry("");
                setIsSettingPin(false);
              }}
              disabled={isSettingPin}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Point Adjustment Modal */}
      {showPointAdjustment && selectedMember && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>⚡ Adjust Points for {selectedMember.name}</h3>
            <p>Current points: {selectedMember.current_points}</p>
            
            <div class="adjustment-form">
              <div class="preset-buttons">
                <button
                  onClick={() => {
                    setAdjustmentAmount("5");
                    setAdjustmentReason("Good job!");
                  }}
                  class="preset-btn good"
                >
                  +5 Good
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("10");
                    setAdjustmentReason("Extra effort!");
                  }}
                  class="preset-btn extra"
                >
                  +10 Extra
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("-2");
                    setAdjustmentReason("Partial completion");
                  }}
                  class="preset-btn half"
                >
                  -2 Half
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("-5");
                    setAdjustmentReason("Remove points");
                  }}
                  class="preset-btn remove"
                >
                  -5 Remove
                </button>
              </div>
              
              <div class="custom-adjustment">
                <label>Custom Amount:</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount((e.target as HTMLInputElement).value)}
                  placeholder="Enter amount"
                />
                
                <label>Reason:</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason((e.target as HTMLInputElement).value)}
                  placeholder="Why are you adjusting points?"
                />
              </div>
            </div>
            
            <div class="modal-actions">
              <button
                onClick={handlePointAdjustment}
                class="btn btn-primary"
                disabled={!adjustmentAmount || !adjustmentReason}
              >
                Apply Adjustment
              </button>
              <button
                onClick={() => {
                  setShowPointAdjustment(false);
                  setSelectedMember(null);
                  setAdjustmentAmount("");
                  setAdjustmentReason("");
                }}
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Template Modal - Slot Assignment */}
      {showRotationModal && selectedPreset && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>📋 Set Up {getPresetByKey(selectedPreset)?.name}</h3>

            {(() => {
              const preset = getPresetByKey(selectedPreset);
              if (!preset) return null;
              const slots = getPresetSlots(preset);

              // Get which children are already selected in other slots
              const selectedInOtherSlots = (currentSlot: string) => {
                return Object.entries(childSlots)
                  .filter(([slot, _]) => slot !== currentSlot)
                  .map(([_, profileId]) => profileId);
              };

              return (
                <div class="slot-mapping">
                  <h4>Assign Kids to Slots</h4>
                  {slots.map((slot) => {
                    const usedIds = selectedInOtherSlots(slot);
                    return (
                      <div key={slot} class="slot-row">
                        <span>{slot}</span>
                        <select
                          value={childSlots[slot] || ""}
                          onChange={(e) => setChildSlots({ ...childSlots, [slot]: e.currentTarget.value })}
                        >
                          <option value="">Select child...</option>
                          {children.map((child) => (
                            <option
                              key={child.id}
                              value={child.id}
                              disabled={usedIds.includes(child.id)}
                            >
                              {child.name}{usedIds.includes(child.id) ? ' (already assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div class="modal-actions">
              <button
                onClick={handleApplyRotation}
                class="btn btn-primary"
                disabled={!selectedPreset || isApplyingRotation}
              >
                {isApplyingRotation ? 'Applying...' : 'Activate Template'}
              </button>
              <button
                onClick={() => setShowRotationModal(false)}
                class="btn btn-secondary"
                disabled={isApplyingRotation}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: var(--color-card);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .settings-section h2 {
          margin: 0 0 1rem 0;
          color: var(--color-text);
          font-size: 1.25rem;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .setting-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: var(--color-text);
        }

        .setting-info p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--color-text);
          opacity: 0.7;
        }

        .setting-status {
          font-weight: 500 !important;
          opacity: 1 !important;
          margin-top: 0.5rem !important;
        }

        .toggle-switch {
          position: relative;
          width: 60px;
          height: 34px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          border-radius: 34px;
          transition: 0.4s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          border-radius: 50%;
          transition: 0.4s;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: var(--color-primary);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .toggle-switch input:disabled + .toggle-slider {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .pin-modal {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .pin-modal h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: var(--color-text);
        }

        .pin-modal p {
          margin: 0 0 2rem 0;
          color: var(--color-text);
          opacity: 0.7;
        }

        .pin-display {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .pin-circle {
          width: 50px;
          height: 50px;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: var(--color-primary);
          transition: all 0.2s ease;
        }

        .pin-circle.filled {
          background: var(--color-primary);
          color: white;
        }

        .pin-status {
          margin-bottom: 2rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .pin-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .pin-key {
          width: 60px;
          height: 60px;
          border: 2px solid var(--color-primary);
          border-radius: 12px;
          background: white;
          color: var(--color-primary);
          font-size: 1.25rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pin-key:hover:not(:disabled) {
          background: var(--color-primary);
          color: white;
          transform: translateY(-2px);
        }

        .pin-key:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .pin-key.confirm {
          background: var(--color-success);
          border-color: var(--color-success);
          color: white;
        }

        .pin-key.confirm:hover:not(:disabled) {
          background: #16a34a;
          border-color: #16a34a;
        }

        .pin-cancel {
          background: var(--color-bg);
          color: var(--color-text);
          border: 1px solid #e5e5e5;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pin-cancel:hover:not(:disabled) {
          background: #e5e5e5;
        }

        .pin-cancel:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }


        .pin-management {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e5e5;
        }

        .pin-management h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: var(--color-text);
        }

        .pin-child-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--color-bg);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .child-name {
          font-weight: 500;
          color: var(--color-text);
        }

        .btn-secondary {
          background: var(--color-bg);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: var(--color-primary);
          color: white;
        }

        .theme-selector {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--color-bg);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-option:hover {
          border-color: #e5e5e5;
        }

        .theme-option.selected {
          border-color: var(--color-primary);
          background: var(--color-card);
        }

        .theme-color {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }

        .theme-name {
          flex: 1;
          font-weight: 500;
          color: var(--color-text);
        }

        .theme-check {
          color: var(--color-primary);
          font-weight: bold;
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
        }

        .member-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .member-name {
          font-weight: 500;
          color: var(--color-text);
        }

        .member-role {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .member-role.parent {
          color: var(--color-primary);
        }

        .member-role.child {
          color: var(--color-secondary);
        }

        .points {
          font-weight: 600;
          color: var(--color-success);
        }

        .danger-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn-danger {
          background: var(--color-warning);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-danger:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        @media (max-width: 600px) {
          .setting-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .danger-actions {
            flex-direction: column;
          }

          .theme-option {
            padding: 0.75rem;
          }
        }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal h3 {
          margin: 0 0 1rem 0;
          color: var(--color-text);
        }

        .adjustment-form {
          margin: 1.5rem 0;
        }

        .preset-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .preset-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .preset-btn.good {
          background: var(--color-success);
          color: white;
        }

        .preset-btn.extra {
          background: var(--color-primary);
          color: white;
        }

        .preset-btn.half {
          background: var(--color-accent);
          color: white;
        }

        .preset-btn.remove {
          background: var(--color-warning);
          color: white;
        }

        .preset-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .custom-adjustment {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .custom-adjustment label {
          font-weight: 500;
          color: var(--color-text);
        }

        .custom-adjustment input {
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1rem;
        }

        .custom-adjustment input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .modal-actions .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .modal-actions .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .modal-actions .btn-secondary {
          background: #e5e7eb;
          color: var(--color-text);
        }

        .modal-actions .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Rotation styles */
        .rotation-active {
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
        }

        .rotation-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
        }

        .rotation-icon {
          font-size: 2rem;
        }

        .rotation-presets {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .rotation-preset-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rotation-preset-option:hover {
          background: #e5e7eb;
        }

        .rotation-preset-option.selected {
          background: #dcfce7;
        }

        .rotation-preset-option input {
          margin-top: 0.25rem;
        }

        .preset-icon {
          font-size: 1.5rem;
        }

        .preset-info {
          flex: 1;
        }

        .preset-info strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .preset-info p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--color-text-light);
        }

        .manage-chores-link {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
        }

        .manage-chores-link:hover {
          text-decoration: underline;
        }

        .slot-mapping {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
        }

        .slot-mapping h4 {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
        }

        .slot-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .slot-row select {
          flex: 1;
          max-width: 200px;
          padding: 0.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        /* Customization styles */
        .customize-section {
          margin-top: 1rem;
        }

        .customize-content {
          margin-top: 1rem;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
        }

        .customize-content h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .chore-customize-list,
        .custom-chores-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .chore-customize-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
        }

        .chore-customize-row.disabled {
          opacity: 0.5;
        }

        .chore-enable {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          cursor: pointer;
        }

        .chore-enable input {
          width: 18px;
          height: 18px;
        }

        .chore-icon {
          font-size: 1.1rem;
        }

        .chore-name {
          flex: 1;
          font-size: 0.9rem;
        }

        .chore-points {
          font-size: 0.85rem;
          color: var(--color-text-light);
          min-width: 40px;
        }

        .chore-points-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.85rem;
          min-width: 70px;
        }

        .btn-remove {
          background: none;
          border: none;
          color: var(--color-warning);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0 0.25rem;
          line-height: 1;
        }

        .btn-remove:hover {
          color: #dc2626;
        }

        .add-chore-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .add-chore-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .customize-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-outline {
          background: white;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .btn-outline:hover:not(:disabled) {
          background: var(--color-primary);
          color: white;
        }

        .btn-outline:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

async function updatePinSetting(enabled: boolean): Promise<boolean> {
  try {
    console.log(`🔧 updatePinSetting called with: ${enabled}`);
    
    const response = await fetch('/api/family/pin-setting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children_pins_enabled: enabled }),
    });

    console.log(`🔧 API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔧 API error response: ${errorText}`);
      throw new Error(`Failed to update PIN setting: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ PIN setting API response:', result);
    
    return result.success || false;
  } catch (error) {
    console.error('❌ Error updating PIN setting:', error);
    return false;
  }
}


function handleResetAllPoints() {
  if (confirm('Are you sure you want to reset all family member points to 0? This cannot be undone.')) {
    // TODO: Call API to reset points
    console.log('Reset all points');
  }
}

function handleClearAllPins() {
  if (confirm('Are you sure you want to clear all kid PINs? Kids will no longer need PINs to access their accounts.')) {
    // TODO: Call API to clear pins
    console.log('Clear all PINs');
  }
}
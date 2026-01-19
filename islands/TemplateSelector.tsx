/**
 * Template Selector - Chore rotation template selection with plan gating
 * Extracted from FamilySettings for modularity (~450 lines)
 */

import { useState, useEffect } from "preact/hooks";
import { ROTATION_PRESETS, getPresetByKey, getPresetSlots, getPresetsByCategory } from "../lib/data/rotation-presets.ts";
import { getRotationConfig, getChoresWithCustomizations } from "../lib/services/rotation-service.ts";
import { canAccessTemplate, hasPaidPlan, getPlan, FREE_TEMPLATES } from "../lib/plan-gate.ts";
import type { RotationPreset, ChildSlotMapping, RotationCustomizations, CustomChore } from "../lib/types/rotation.ts";

interface Props {
  settings: any;
  children: { id: string; name: string }[];
  onRemoveRotation: () => Promise<void>;
}

export default function TemplateSelector({ settings, children, onRemoveRotation }: Props) {
  const activeRotation = getRotationConfig(settings || {});
  const plan = getPlan(settings);
  const isPaid = hasPaidPlan(settings);

  // Template selection modal state
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [childSlots, setChildSlots] = useState<Record<string, string>>({});
  const [isApplyingRotation, setIsApplyingRotation] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedTemplate, setLockedTemplate] = useState<RotationPreset | null>(null);

  // Customization state
  const [showCustomize, setShowCustomize] = useState(false);
  const [choreOverrides, setChoreOverrides] = useState<Record<string, { points?: number; enabled?: boolean }>>({});
  const [customChores, setCustomChores] = useState<CustomChore[]>([]);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChorePoints, setNewChorePoints] = useState("1");
  const [isSavingCustomizations, setIsSavingCustomizations] = useState(false);
  const [inlineChildSlots, setInlineChildSlots] = useState<Record<string, string>>({});

  // Initialize customization state from active rotation
  useEffect(() => {
    if (activeRotation) {
      setChoreOverrides(activeRotation.customizations?.chore_overrides || {});
      setCustomChores(activeRotation.customizations?.custom_chores || []);

      // Build inlineChildSlots from activeRotation.child_slots
      const existing: Record<string, string> = {};
      activeRotation.child_slots?.forEach((s: { slot: string; profile_id: string }) => {
        if (s.profile_id) {
          existing[s.slot] = s.profile_id;
        }
      });
      setInlineChildSlots(existing);
    }
  }, [activeRotation?.active_preset]);

  const handleTemplateClick = (preset: RotationPreset) => {
    // Check if template is gated
    if (!canAccessTemplate(settings, preset.key)) {
      setLockedTemplate(preset);
      setShowUpgradeModal(true);
      return;
    }

    // Open slot assignment modal
    setSelectedPreset(preset.key);

    // If this is the currently active template, use current customization state or saved assignments
    if (activeRotation?.active_preset === preset.key) {
      // Use inlineChildSlots if there are edits, otherwise use saved activeRotation.child_slots
      if (Object.keys(inlineChildSlots).length > 0) {
        setChildSlots({ ...inlineChildSlots });
      } else if (activeRotation.child_slots?.length > 0) {
        const existing: Record<string, string> = {};
        activeRotation.child_slots.forEach((s: { slot: string; profile_id: string }) => {
          if (s.profile_id) {
            existing[s.slot] = s.profile_id;
          }
        });
        setChildSlots(existing);
      }
    } else {
      // For new template, pre-select children in order
      const slots = getPresetSlots(preset);
      const preSelected: Record<string, string> = {};
      if (preset.is_dynamic) {
        // For dynamic templates, pre-select all children
        children.forEach((child, i) => {
          preSelected[`participant_${i}`] = child.id;
        });
      } else {
        // For slot-based templates, assign children to slots in order
        slots.forEach((slot, i) => {
          if (children[i]) preSelected[slot] = children[i].id;
        });
      }
      setChildSlots(preSelected);
    }
    setShowRotationModal(true);
  };

  const handleApplyRotation = async () => {
    if (!selectedPreset) return;
    const preset = getPresetByKey(selectedPreset);
    if (!preset) return;

    let mappings: ChildSlotMapping[];

    if (preset.is_dynamic) {
      mappings = Object.entries(childSlots)
        .filter(([_, profileId]) => profileId)
        .map(([slot, profileId]) => ({ slot, profile_id: profileId }));
      if (mappings.length === 0) {
        alert("Please select at least one child to participate");
        return;
      }
    } else {
      const slots = getPresetSlots(preset);
      mappings = slots
        .filter(slot => childSlots[slot])
        .map(slot => ({ slot, profile_id: childSlots[slot] }));
      if (mappings.length === 0) {
        alert("Please assign at least one child to a slot");
        return;
      }
      const profileIds = mappings.map(m => m.profile_id);
      if (new Set(profileIds).size !== profileIds.length) {
        alert("Each slot must have a different child assigned");
        return;
      }
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

  const handleAddCustomChore = () => {
    console.log('🔧 handleAddCustomChore called:', { newChoreName, newChorePoints, currentCustomChores: customChores });
    if (!newChoreName.trim()) {
      console.log('🔧 Empty name, returning');
      return;
    }
    const key = `custom_${Date.now()}`;
    const newChore = { key, name: newChoreName.trim(), points: parseInt(newChorePoints) || 1 };
    console.log('🔧 Adding custom chore:', newChore);
    setCustomChores([...customChores, newChore]);
    setNewChoreName("");
    setNewChorePoints("1");
    console.log('🔧 Custom chores after add:', [...customChores, newChore]);
  };

  const handleSaveCustomizations = async () => {
    if (!activeRotation) return;
    setIsSavingCustomizations(true);

    const customizations: RotationCustomizations = {};
    if (Object.keys(choreOverrides).length > 0) customizations.chore_overrides = choreOverrides;
    if (customChores.length > 0) customizations.custom_chores = customChores;

    const preset = getPresetByKey(activeRotation.active_preset);
    let childSlotsToSave: { slot: string; profile_id: string }[];

    if (preset?.is_dynamic) {
      // For dynamic templates, use participant_N slots from inlineChildSlots
      childSlotsToSave = Object.entries(inlineChildSlots)
        .filter(([_, profileId]) => profileId)
        .map(([slot, profileId]) => ({ slot, profile_id: profileId }));
    } else {
      // For slot-based templates, map slots to child assignments
      const slots = preset ? getPresetSlots(preset) : [];
      childSlotsToSave = slots.map(slot => ({ slot, profile_id: inlineChildSlots[slot] || "" }));
    }

    try {
      const response = await fetch('/api/rotation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_key: activeRotation.active_preset,
          child_slots: childSlotsToSave,
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

  const { everyday, seasonal } = getPresetsByCategory(children.length);

  // Group templates by free vs paid
  const allTemplates = [...everyday, ...seasonal];
  const freeTemplates = allTemplates.filter(p => FREE_TEMPLATES.includes(p.key));
  const paidTemplates = allTemplates.filter(p => !FREE_TEMPLATES.includes(p.key));

  return (
    <div class="template-selector">
      {/* Plan Status Banner */}
      <div class={`plan-banner ${isPaid ? 'paid' : 'free'}`}>
        {isPaid ? (
          <>
            <span class="plan-icon">📚</span>
            <span>Family Plan</span>
            <span class="plan-expiry">ends in {plan.daysRemaining} days</span>
          </>
        ) : (
          <div class="free-plan-info">
            <div class="free-plan-main">
              <span class="plan-icon">🎁</span>
              <div class="free-plan-text">
                <span class="free-plan-title">Free Plan</span>
                <span class="free-plan-desc">3 templates included · Unlock 5 more with Family Plan</span>
              </div>
            </div>
            <a href="/redeem" class="redeem-link">Redeem gift code →</a>
          </div>
        )}
      </div>

      <h2>📋 Chore Assignment Mode</h2>
      <p class="section-desc">Choose how chores are assigned to kids</p>

      <div class="rotation-presets">
        {/* Manual Option */}
        <label class={`rotation-preset-option ${!activeRotation ? 'selected' : ''}`} style={{ borderLeft: '4px solid #6b7280' }}>
          <input type="radio" name="assignment-mode" value="manual" checked={!activeRotation} onChange={onRemoveRotation} />
          <span class="preset-icon">📝</span>
          <div class="preset-info">
            <strong>Manual (Default)</strong>
            <p>You create and assign chores yourself</p>
            <a href="/parent/dashboard" class="manage-link" onClick={(e) => e.stopPropagation()}>View Dashboard →</a>
          </div>
        </label>

        {/* Free Templates */}
        {freeTemplates.length > 0 && <div class="preset-category-header free-header">Free Templates</div>}
        {freeTemplates.map(preset => renderPresetOption(preset, activeRotation, settings, handleTemplateClick))}

        {/* Family Plan Templates */}
        {paidTemplates.length > 0 && <div class="preset-category-header paid-header">Family Plan</div>}
        {paidTemplates.map(preset => renderPresetOption(preset, activeRotation, settings, handleTemplateClick))}
      </div>

      {activeRotation && (() => {
        const activePreset = getPresetByKey(activeRotation.active_preset);
        return (
          <div class="active-template-banner">
            <div class="active-template-name">
              <span class="active-icon">{activePreset?.icon || '📋'}</span>
              <strong>{activePreset?.name || 'Custom Template'}</strong>
            </div>
            <p class="rotation-start">Started {activeRotation.start_date}</p>
          </div>
        );
      })()}

      {/* Inline Customization */}
      {activeRotation && (() => {
        const activePreset = getPresetByKey(activeRotation.active_preset);
        return (
          <div class="customize-section">
            <button class="btn btn-outline" onClick={() => setShowCustomize(!showCustomize)} style={{ marginTop: "1rem", width: "100%" }}>
              {showCustomize ? `▼ Hide ${activePreset?.name || 'Template'} Customization` : `▶ Customize ${activePreset?.name || 'Template'}`}
            </button>

          {showCustomize && renderCustomizePanel(
            activeRotation, children, inlineChildSlots, setInlineChildSlots,
            choreOverrides, setChoreOverrides, customChores, setCustomChores,
            newChoreName, setNewChoreName, newChorePoints, setNewChorePoints,
            handleAddCustomChore, handleSaveCustomizations, isSavingCustomizations
          )}
          </div>
        );
      })()}

      {/* Slot Assignment Modal */}
      {showRotationModal && selectedPreset && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>📋 Set Up {getPresetByKey(selectedPreset)?.name}</h3>
            {renderSlotMapping(selectedPreset, children, childSlots, setChildSlots)}
            <div class="modal-actions">
              <button onClick={handleApplyRotation} class="btn btn-primary" disabled={isApplyingRotation}>
                {isApplyingRotation ? 'Applying...' : 'Activate Template'}
              </button>
              <button onClick={() => setShowRotationModal(false)} class="btn btn-secondary" disabled={isApplyingRotation}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && lockedTemplate && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>{lockedTemplate.icon} {lockedTemplate.name}</h3>
            <p class="template-desc">{lockedTemplate.description}</p>
            <p class="gated-notice">This template is part of <strong>Family Plan</strong>.</p>
            <div class="modal-actions">
              <a href="/redeem" class="btn btn-primary">Enter Gift Code</a>
              <button onClick={() => setShowUpgradeModal(false)} class="btn btn-secondary">Not Now</button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function renderPresetOption(
  preset: RotationPreset,
  activeRotation: any,
  settings: any,
  onClick: (p: RotationPreset) => void
) {
  const isActive = activeRotation?.active_preset === preset.key;
  const isLocked = !canAccessTemplate(settings, preset.key);
  const isFree = FREE_TEMPLATES.includes(preset.key);

  return (
    <label
      key={preset.key}
      class={`rotation-preset-option ${isActive ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
      style={{ borderLeft: `4px solid ${preset.color || '#ccc'}` }}
      onClick={(e) => { e.preventDefault(); onClick(preset); }}
    >
      <input type="radio" name="assignment-mode" value={preset.key} checked={isActive} readOnly />
      <span class="preset-icon">{preset.icon}</span>
      <div class="preset-info">
        <strong>{preset.name} {isLocked && <span class="lock-icon">🔒</span>}</strong>
        <p>{preset.description}</p>
        <div class="preset-badges">
          {isActive && <span class="active-badge">ACTIVE</span>}
          {isFree && <span class="free-badge">FREE</span>}
        </div>
      </div>
    </label>
  );
}

function renderSlotMapping(
  presetKey: string,
  children: { id: string; name: string }[],
  childSlots: Record<string, string>,
  setChildSlots: (s: Record<string, string>) => void
) {
  const preset = getPresetByKey(presetKey);
  if (!preset) return null;

  if (preset.is_dynamic) {
    const selectedKidIds = Object.values(childSlots).filter(id => id);
    return (
      <div class="slot-mapping">
        <h4>Select Kids to Include</h4>
        <p class="slot-hint">All selected kids get personal chores daily. Shared chores rotate automatically.</p>
        <div class="dynamic-kid-list">
          {children.map(child => {
            const isSelected = selectedKidIds.includes(child.id);
            return (
              <label key={child.id} class="dynamic-kid-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      const nextIndex = Object.keys(childSlots).length;
                      setChildSlots({ ...childSlots, [`participant_${nextIndex}`]: child.id });
                    } else {
                      const remaining = Object.values(childSlots).filter(id => id !== child.id);
                      const newSlots: Record<string, string> = {};
                      remaining.forEach((id, i) => { newSlots[`participant_${i}`] = id; });
                      setChildSlots(newSlots);
                    }
                  }}
                />
                <span>{child.name}</span>
              </label>
            );
          })}
        </div>
        {selectedKidIds.length > 0 && (
          <p class="dynamic-summary">✓ {selectedKidIds.length} kid{selectedKidIds.length > 1 ? 's' : ''} will participate</p>
        )}
      </div>
    );
  }

  const slots = getPresetSlots(preset);
  const selectedInOtherSlots = (currentSlot: string) =>
    Object.entries(childSlots).filter(([slot]) => slot !== currentSlot).map(([_, id]) => id);

  return (
    <div class="slot-mapping">
      <h4>Assign Kids to Slots</h4>
      <p class="slot-hint">This template has {slots.length} slots.</p>
      {slots.map(slot => {
        const usedIds = selectedInOtherSlots(slot);
        return (
          <div key={slot} class="slot-row">
            <span>{slot}</span>
            <select value={childSlots[slot] || ""} onChange={(e) => setChildSlots({ ...childSlots, [slot]: e.currentTarget.value })}>
              <option value="">(Not assigned)</option>
              {children.map(child => (
                <option key={child.id} value={child.id} disabled={usedIds.includes(child.id)}>
                  {child.name}{usedIds.includes(child.id) ? ' (assigned)' : ''}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function renderCustomizePanel(
  activeRotation: any, children: any[], inlineChildSlots: Record<string, string>,
  setInlineChildSlots: (s: Record<string, string>) => void,
  choreOverrides: Record<string, any>, setChoreOverrides: (o: Record<string, any>) => void,
  customChores: CustomChore[], setCustomChores: (c: CustomChore[]) => void,
  newChoreName: string, setNewChoreName: (n: string) => void,
  newChorePoints: string, setNewChorePoints: (p: string) => void,
  handleAddCustomChore: () => void, handleSaveCustomizations: () => Promise<void>,
  isSaving: boolean
) {
  const preset = getPresetByKey(activeRotation.active_preset);
  if (!preset) return null;

  const slots = getPresetSlots(preset);
  const isDynamic = preset.is_dynamic;

  // For dynamic templates, get participant IDs from activeRotation.child_slots
  const participantIds = isDynamic
    ? (activeRotation.child_slots || []).map((s: any) => s.profile_id).filter(Boolean)
    : [];

  // For slot-based templates, track which kids are already assigned to other slots
  const getUsedIdsExcludingSlot = (currentSlot: string) =>
    Object.entries(inlineChildSlots)
      .filter(([slot]) => slot !== currentSlot)
      .map(([_, id]) => id)
      .filter(Boolean);

  return (
    <div class="customize-content">
      <h4>Kid Assignment</h4>
      {isDynamic ? (
        // Dynamic templates: show checkboxes for kid selection
        <div class="dynamic-kid-customize">
          <p class="slot-hint">Select which kids participate in this template:</p>
          <div class="dynamic-kid-list">
            {children.map(child => {
              // Only check inlineChildSlots for current selection state
              const isSelected = Object.values(inlineChildSlots).includes(child.id);
              return (
                <label key={child.id} class={`dynamic-kid-checkbox ${isSelected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        const nextIndex = Object.keys(inlineChildSlots).length;
                        setInlineChildSlots({ ...inlineChildSlots, [`participant_${nextIndex}`]: child.id });
                      } else {
                        const remaining = Object.entries(inlineChildSlots)
                          .filter(([_, id]) => id !== child.id)
                          .map(([_, id]) => id);
                        const newSlots: Record<string, string> = {};
                        remaining.forEach((id, i) => { newSlots[`participant_${i}`] = id; });
                        setInlineChildSlots(newSlots);
                      }
                    }}
                  />
                  <span>{child.name}</span>
                </label>
              );
            })}
          </div>
          {Object.keys(inlineChildSlots).length > 0 && (
            <p class="dynamic-summary">✓ {Object.keys(inlineChildSlots).length} kid{Object.keys(inlineChildSlots).length > 1 ? 's' : ''} participating</p>
          )}
        </div>
      ) : (
        // Slot-based templates: show dropdowns with duplicate prevention
        <div class="inline-slot-mapping">
          {slots.map(slot => {
            const usedIds = getUsedIdsExcludingSlot(slot);
            return (
              <div key={slot} class="inline-slot-row">
                <span class="slot-label">{slot}:</span>
                <select
                  value={inlineChildSlots[slot] || ""}
                  onChange={(e) => setInlineChildSlots({ ...inlineChildSlots, [slot]: e.currentTarget.value })}
                  class="slot-select"
                >
                  <option value="">Select child...</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id} disabled={usedIds.includes(child.id)}>
                      {child.name}{usedIds.includes(child.id) ? ' (assigned)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <h4 style={{ marginTop: "1.5rem" }}>Template Chores</h4>
      <div class="chore-customize-list">
        {preset.chores.map(chore => {
          const override = choreOverrides[chore.key] || {};
          const isEnabled = override.enabled !== false;
          const points = override.points ?? chore.points;
          return (
            <div key={chore.key} class={`chore-customize-row ${!isEnabled ? 'disabled' : ''}`}>
              <label class="chore-enable">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setChoreOverrides({ ...choreOverrides, [chore.key]: { ...override, enabled: e.currentTarget.checked } })}
                />
                <span class="chore-icon">{chore.icon}</span>
                <span class="chore-name">{chore.name}</span>
              </label>
              <select
                value={points}
                onChange={(e) => setChoreOverrides({ ...choreOverrides, [chore.key]: { ...override, points: parseInt(e.currentTarget.value) } })}
                disabled={!isEnabled}
                class="chore-points-select"
              >
                {[0,1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      <h4 style={{ marginTop: "1.5rem" }}>Custom Chores ({customChores.length})</h4>
      <div class="custom-chores-list">
        {console.log('🔧 Rendering custom chores:', customChores)}
        {customChores.map(chore => (
          <div key={chore.key} class="chore-customize-row">
            <span class="chore-icon">{chore.icon || '✨'}</span>
            <span class="chore-name">{chore.name}</span>
            <span class="chore-points">{chore.points} pt{chore.points > 1 ? 's' : ''}</span>
            <button class="btn-remove" onClick={() => setCustomChores(customChores.filter(c => c.key !== chore.key))}>×</button>
          </div>
        ))}
        <div class="add-chore-row">
          <input type="text" value={newChoreName} onInput={(e) => setNewChoreName((e.target as HTMLInputElement).value)} placeholder="Chore name" class="add-chore-input" />
          <select value={newChorePoints} onChange={(e) => setNewChorePoints(e.currentTarget.value)} class="chore-points-select">
            {[0,1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>)}
          </select>
          <button class="btn btn-outline" onClick={() => { console.log('🔧 Add button clicked'); handleAddCustomChore(); }} disabled={!newChoreName.trim()}>+ Add</button>
        </div>
      </div>

      <div class="customize-actions">
        <button class="btn btn-primary" onClick={handleSaveCustomizations} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const styles = `
  .template-selector { margin-bottom: 1rem; }
  .plan-banner { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
  .plan-banner.paid { background: #dcfce7; color: #166534; }
  .plan-banner.free { background: #f0fdf4; color: #4b5563; border: 1px solid #d1fae5; }
  .plan-icon { font-size: 1rem; }
  .plan-expiry { margin-left: auto; opacity: 0.7; }
  .free-plan-info { display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 0.5rem; }
  .free-plan-main { display: flex; align-items: center; gap: 0.5rem; }
  .free-plan-text { display: flex; flex-direction: column; gap: 0.125rem; }
  .free-plan-title { font-weight: 600; color: #374151; }
  .free-plan-desc { font-size: 0.75rem; color: #6b7280; }
  .redeem-link { color: var(--color-primary); text-decoration: none; font-weight: 500; white-space: nowrap; }
  .section-desc { font-size: 0.875rem; color: var(--color-text-light); margin-bottom: 1rem; }
  .rotation-presets { display: flex; flex-direction: column; gap: 0.75rem; }
  .rotation-preset-option { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: var(--color-bg); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .rotation-preset-option:hover { background: #e5e7eb; }
  .rotation-preset-option.selected { background: #dcfce7; }
  .rotation-preset-option.locked { opacity: 0.7; }
  .rotation-preset-option input { margin-top: 0.25rem; }
  .preset-icon { font-size: 1.5rem; }
  .preset-info { flex: 1; }
  .preset-info strong { display: flex; align-items: center; gap: 0.5rem; }
  .preset-info p { margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--color-text-light); }
  .lock-icon { font-size: 0.875rem; }
  .preset-badges { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .free-badge { font-size: 0.65rem; background: var(--color-primary); color: white; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
  .active-badge { font-size: 0.65rem; background: #3b82f6; color: white; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
  .preset-category-header { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-light); margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb; }
  .manage-link { display: inline-block; margin-top: 0.5rem; font-size: 0.8rem; color: var(--color-primary); text-decoration: none; }
  .rotation-start { font-size: 0.75rem; color: var(--color-text-light); margin: 0; }
  .active-template-banner { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 2px solid #22c55e; }
  .active-template-name { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #166534; margin-bottom: 0.25rem; }
  .active-icon { font-size: 1.25rem; }
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
  .modal h3 { margin: 0 0 1rem; }
  .template-desc { color: var(--color-text-light); margin-bottom: 1rem; }
  .gated-notice { background: #fef3c7; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; }
  .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; text-decoration: none; }
  .btn-primary { background: var(--color-primary); color: white; }
  .btn-secondary { background: #e5e7eb; color: var(--color-text); }
  .btn-outline { background: white; color: var(--color-primary); border: 1px solid var(--color-primary); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .slot-mapping { margin-bottom: 1.5rem; padding: 1rem; background: var(--color-bg); border-radius: 8px; }
  .slot-mapping h4 { margin: 0 0 1rem; font-size: 0.9rem; }
  .slot-hint { font-size: 0.85rem; color: var(--color-text-light); margin: 0 0 1rem; }
  .slot-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; }
  .slot-row select { flex: 1; max-width: 200px; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 6px; }
  .dynamic-kid-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .dynamic-kid-checkbox { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
  .dynamic-kid-checkbox.selected { border-color: var(--color-primary); background: #f0fdf4; }
  .dynamic-kid-checkbox input { width: 1.25rem; height: 1.25rem; accent-color: var(--color-primary); }
  .dynamic-summary { margin-top: 1rem; padding: 0.5rem 0.75rem; background: #dcfce7; border-radius: 6px; font-size: 0.9rem; color: #166534; }
  .customize-content { margin-top: 1rem; padding: 1rem; background: var(--color-bg); border-radius: 8px; }
  .customize-content h4 { margin: 0 0 0.75rem; font-size: 0.9rem; }
  .inline-slot-mapping { display: flex; flex-direction: column; gap: 0.5rem; }
  .inline-slot-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: white; border-radius: 6px; }
  .slot-label { min-width: 60px; font-weight: 500; font-size: 0.9rem; }
  .slot-select { flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; }
  .chore-customize-list, .custom-chores-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .chore-customize-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 6px; }
  .chore-customize-row.disabled { opacity: 0.5; }
  .chore-enable { display: flex; align-items: center; gap: 0.5rem; flex: 1; cursor: pointer; }
  .chore-enable input { width: 18px; height: 18px; }
  .chore-icon { font-size: 1.1rem; }
  .chore-name { flex: 1; font-size: 0.9rem; }
  .chore-points { font-size: 0.85rem; color: var(--color-text-light); min-width: 40px; }
  .chore-points-select { padding: 0.25rem 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem; min-width: 70px; }
  .btn-remove { background: none; border: none; color: var(--color-warning); font-size: 1.25rem; cursor: pointer; padding: 0 0.25rem; }
  .add-chore-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .add-chore-input { flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; }
  .customize-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
`;

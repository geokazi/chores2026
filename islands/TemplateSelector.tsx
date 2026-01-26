/**
 * Template Selector - Chore rotation template selection with plan gating
 * Extracted from FamilySettings for modularity (~450 lines)
 */

import { useState, useEffect } from "preact/hooks";
import { ROTATION_PRESETS, getPresetByKey, getPresetSlots, getPresetsByCategory } from "../lib/data/rotation-presets.ts";
import { getRotationConfig, getChoresWithCustomizations, getSchedulePreview, findChoreByKey } from "../lib/services/rotation-service.ts";
import { canAccessTemplate, hasPaidPlan, getPlan, FREE_TEMPLATES } from "../lib/plan-gate.ts";
import type { RotationPreset, ChildSlotMapping, RotationCustomizations, CustomChore, RotationConfig } from "../lib/types/rotation.ts";
import ModalHeader from "../components/ModalHeader.tsx";
import SchedulePreviewTable from "../components/SchedulePreviewTable.tsx";

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

  // Assignment mode state (NEW)
  const [assignmentMode, setAssignmentMode] = useState<'rotation' | 'custom'>('rotation');
  const [customAssignments, setCustomAssignments] = useState<Record<string, string[]>>({});
  const [showHiddenChores, setShowHiddenChores] = useState(false);

  // Daily chores, rest days, rotation frequency, and schedule preview state
  const [dailyChores, setDailyChores] = useState<string[]>([]);
  const [restDays, setRestDays] = useState<string[]>([]);
  const [rotationPeriod, setRotationPeriod] = useState<1 | 2>(1);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // Inline Add/Edit Chore form state (for Manual mode)
  const [showAddChoreForm, setShowAddChoreForm] = useState(false);
  const [addChoreName, setAddChoreName] = useState("");
  const [addChorePoints, setAddChorePoints] = useState("1");
  const [addChoreIsRecurring, setAddChoreIsRecurring] = useState(false);
  const [addChoreRecurringDays, setAddChoreRecurringDays] = useState<string[]>([]);
  const [addChoreAssignedTo, setAddChoreAssignedTo] = useState("");
  const [isAddingChore, setIsAddingChore] = useState(false);

  // Edit mode state
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editingChoreType, setEditingChoreType] = useState<'recurring' | 'one_time' | null>(null);
  const [addChoreDueDate, setAddChoreDueDate] = useState("");

  // Existing chores (for Manual mode)
  const [recurringChores, setRecurringChores] = useState<Array<{
    id: string;
    name: string;
    points: number;
    recurring_days: string[];
    assigned_to_profile_id?: string;
    assigned_to_name?: string;
  }>>([]);
  const [oneTimeChores, setOneTimeChores] = useState<Array<{
    id: string;
    name: string;
    points: number;
    due_date: string;
    assigned_to_profile_id?: string;
    assigned_to_name?: string;
  }>>([]);
  const [loadingChores, setLoadingChores] = useState(false);

  // Initialize custom chores from family-level settings (available for ALL templates)
  useEffect(() => {
    const familyCustomChores = settings?.apps?.choregami?.custom_chores || [];
    setCustomChores(familyCustomChores);
  }, [settings?.apps?.choregami?.custom_chores]);

  // Fetch existing chores when in Manual mode
  const fetchManualChores = () => {
    setLoadingChores(true);
    fetch('/api/chores/recurring', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecurringChores(data.recurring || data.templates || []);
          setOneTimeChores(data.oneTime || []);
        }
      })
      .catch(err => console.warn('Failed to load chores:', err))
      .finally(() => setLoadingChores(false));
  };

  // Fetch chores on mount when in Manual mode
  useEffect(() => {
    if (!activeRotation) {
      fetchManualChores();
    }
  }, []);  // Only on mount - page reloads when switching modes

  // Initialize template-specific state from active rotation
  useEffect(() => {
    if (activeRotation) {
      setChoreOverrides(activeRotation.customizations?.chore_overrides || {});

      // Build inlineChildSlots from activeRotation.child_slots
      const existing: Record<string, string> = {};
      activeRotation.child_slots?.forEach((s: { slot: string; profile_id: string }) => {
        if (s.profile_id) {
          existing[s.slot] = s.profile_id;
        }
      });
      setInlineChildSlots(existing);

      // Load assignment mode and custom assignments
      setAssignmentMode(activeRotation.assignment_mode || 'rotation');
      setCustomAssignments(activeRotation.customizations?.custom_assignments || {});

      // Load daily chores
      setDailyChores(activeRotation.customizations?.daily_chores || []);

      // Load rest days
      setRestDays(activeRotation.customizations?.rest_days || []);

      // Load rotation period
      setRotationPeriod(activeRotation.customizations?.rotation_period_weeks || 1);
    }
  }, [activeRotation?.active_preset, activeRotation?.assignment_mode]);

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
        credentials: 'include',
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
    if (!newChoreName.trim()) return;
    const key = `custom_${Date.now()}`;
    const parsedPoints = parseInt(newChorePoints);
    const newChore = { key, name: newChoreName.trim(), points: isNaN(parsedPoints) ? 1 : parsedPoints };
    setCustomChores([...customChores, newChore]);
    setNewChoreName("");
    setNewChorePoints("1");
  };

  // Save custom chores independently (for Manual mode or standalone use)
  const handleSaveCustomChoresOnly = async () => {
    setIsSavingCustomizations(true);
    try {
      const response = await fetch('/api/family/custom-chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_chores: customChores }),
      });

      if (response.ok) {
        alert('✅ Custom chores saved!');
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

  const handleSaveCustomizations = async () => {
    if (!activeRotation) return;

    // Validate custom mode has at least one assignment
    if (assignmentMode === 'custom') {
      const totalAssignments = Object.values(customAssignments).reduce((sum, arr) => sum + arr.length, 0);
      if (totalAssignments === 0) {
        alert('Please assign at least one chore to a kid in "I\'ll Choose" mode.');
        return;
      }
    }

    setIsSavingCustomizations(true);

    // Template-specific customizations (chore overrides + custom assignments + daily chores + rest days)
    // Always save custom_assignments so they persist when switching modes
    const customizations: RotationCustomizations = {};
    if (Object.keys(choreOverrides).length > 0) customizations.chore_overrides = choreOverrides;
    if (Object.keys(customAssignments).length > 0) {
      customizations.custom_assignments = customAssignments;
    }
    if (dailyChores.length > 0) {
      customizations.daily_chores = dailyChores;
    }
    if (restDays.length > 0) {
      customizations.rest_days = restDays as any;  // DayOfWeek[]
    }
    if (rotationPeriod !== 1) {
      customizations.rotation_period_weeks = rotationPeriod;
    }

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
      // Save family-level custom chores (available for ALL templates)
      const customChoresResponse = await fetch('/api/family/custom-chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_chores: customChores }),
      });

      if (!customChoresResponse.ok) {
        const result = await customChoresResponse.json();
        alert(`❌ Failed to save custom chores: ${result.error}`);
        setIsSavingCustomizations(false);
        return;
      }

      // Save template-specific customizations (chore overrides, child slots, assignment mode)
      const response = await fetch('/api/rotation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preset_key: activeRotation.active_preset,
          child_slots: childSlotsToSave,
          customizations: Object.keys(customizations).length > 0 ? customizations : null,
          start_date: activeRotation.start_date,
          assignment_mode: assignmentMode,
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

  // Handle deleting a chore (Manual mode)
  const handleDeleteChore = async (choreId: string, type: 'recurring' | 'one_time', name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/chores/${choreId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      });

      const result = await response.json();
      if (result.success) {
        // Refresh the list
        fetchManualChores();
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
  };

  // Helper to reset form state
  const resetChoreForm = () => {
    setAddChoreName("");
    setAddChorePoints("1");
    setAddChoreIsRecurring(false);
    setAddChoreRecurringDays([]);
    setAddChoreAssignedTo("");
    setAddChoreDueDate("");
    setEditingChoreId(null);
    setEditingChoreType(null);
    setShowAddChoreForm(false);
  };

  // Start editing a chore - populate form with existing data
  const handleStartEdit = (chore: any, type: 'recurring' | 'one_time') => {
    setEditingChoreId(chore.id);
    setEditingChoreType(type);
    setAddChoreName(chore.name);
    setAddChorePoints(String(chore.points));
    setAddChoreIsRecurring(type === 'recurring');

    if (type === 'recurring') {
      setAddChoreRecurringDays(chore.recurring_days || []);
      setAddChoreDueDate("");
    } else {
      setAddChoreRecurringDays([]);
      // Convert due_date to YYYY-MM-DD format for date input
      if (chore.due_date) {
        const date = new Date(chore.due_date);
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        setAddChoreDueDate(localDate);
      }
    }

    // Use assigned_to_profile_id directly (more reliable than name lookup)
    setAddChoreAssignedTo(chore.assigned_to_profile_id || "");
    setShowAddChoreForm(true);
  };

  // Handle adding or editing a chore (Manual mode inline form)
  const handleAddChore = async () => {
    if (!addChoreName.trim() || !addChoreAssignedTo) {
      alert("Please enter a chore name and select a kid");
      return;
    }

    if (addChoreIsRecurring && addChoreRecurringDays.length === 0) {
      alert("Please select at least one day for recurring chores");
      return;
    }

    setIsAddingChore(true);
    try {
      // EDIT MODE: Update existing chore
      if (editingChoreId && editingChoreType) {
        const response = await fetch(`/api/chores/${editingChoreId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: editingChoreType,
            name: addChoreName.trim(),
            points: parseInt(addChorePoints) || 1,
            assignedTo: addChoreAssignedTo,
            ...(editingChoreType === 'recurring'
              ? { recurringDays: addChoreRecurringDays }
              : { dueDate: addChoreDueDate ? addChoreDueDate + "T12:00:00" : undefined }),
          }),
        });

        const result = await response.json();
        if (result.success) {
          alert(`✅ ${result.message}`);
          resetChoreForm();
          fetchManualChores();
        } else {
          alert(`❌ ${result.error}`);
        }
      }
      // ADD MODE: Create new chore
      else {
        // Use local date components to avoid UTC conversion issues
        // e.g., 8:53 PM Sunday in Pacific should stay Sunday, not become Monday UTC
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const response = await fetch('/api/chores/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: addChoreName.trim(),
            points: parseInt(addChorePoints) || 1,
            assignedTo: addChoreAssignedTo,
            dueDate: localDate + "T12:00:00",  // Noon local, no Z suffix = treated as local time
            isRecurring: addChoreIsRecurring,
            recurringDays: addChoreIsRecurring ? addChoreRecurringDays : undefined,
          }),
        });

        const result = await response.json();
        if (result.success) {
          alert(`✅ ${result.message}`);
          resetChoreForm();
          fetchManualChores();
        } else {
          alert(`❌ ${result.error}`);
        }
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
    setIsAddingChore(false);
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
        <div class={`rotation-preset-option manual-mode-card ${!activeRotation ? 'selected' : ''}`} style={{ borderLeft: '4px solid #6b7280' }}>
          <label class="manual-header">
            <input type="radio" name="assignment-mode" value="manual" checked={!activeRotation} onChange={onRemoveRotation} />
            <span class="preset-icon">📝</span>
            <div class="preset-info">
              <strong>Manual (Default)</strong>
              <p>You create and assign chores yourself</p>
              <a href="/parent/dashboard" class="manage-link" onClick={(e) => e.stopPropagation()}>View Dashboard →</a>
            </div>
          </label>

          {/* Inline Add Chore Form (only when Manual mode is selected) */}
          {!activeRotation && (
            <div class="manual-add-chore-section">
              {/* Existing Chores */}
              {loadingChores ? (
                <p class="loading-hint">Loading chores...</p>
              ) : (recurringChores.length > 0 || oneTimeChores.length > 0) && (
                <div class="existing-chores-section">
                  {/* Recurring Chores */}
                  {recurringChores.length > 0 && (
                    <>
                      <h4>🔁 Recurring Chores</h4>
                      <div class="chores-list">
                        {recurringChores.map(chore => {
                          const dayLabels: Record<string, string> = {
                            mon: 'M', tue: 'T', wed: 'W', thu: 'Th', fri: 'F', sat: 'Sa', sun: 'Su'
                          };
                          const daysDisplay = (chore.recurring_days || []).map(d => dayLabels[d] || d).join(' ');
                          return (
                            <div key={chore.id} class="chore-item">
                              <div class="chore-info">
                                <span class="chore-name">{chore.name}</span>
                                <span class="chore-meta">
                                  {chore.points}pt · {chore.assigned_to_name || 'Unassigned'} · {daysDisplay}
                                </span>
                              </div>
                              <div class="chore-actions">
                                <button
                                  class="btn-edit"
                                  onClick={() => handleStartEdit(chore, 'recurring')}
                                  title="Edit"
                                >✏️</button>
                                <button
                                  class="btn-delete"
                                  onClick={() => handleDeleteChore(chore.id, 'recurring', chore.name)}
                                  title="Delete"
                                >×</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* One-Time Chores */}
                  {oneTimeChores.length > 0 && (
                    <>
                      <h4 style={{ marginTop: recurringChores.length > 0 ? '1rem' : 0 }}>📋 Pending One-Time Chores</h4>
                      <div class="chores-list">
                        {oneTimeChores.map(chore => {
                          const dueDate = new Date(chore.due_date);
                          const isToday = dueDate.toDateString() === new Date().toDateString();
                          const dateDisplay = isToday ? 'Today' : dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          return (
                            <div key={chore.id} class="chore-item">
                              <div class="chore-info">
                                <span class="chore-name">{chore.name}</span>
                                <span class="chore-meta">
                                  {chore.points}pt · {chore.assigned_to_name || 'Unassigned'} · {dateDisplay}
                                </span>
                              </div>
                              <div class="chore-actions">
                                <button
                                  class="btn-edit"
                                  onClick={() => handleStartEdit(chore, 'one_time')}
                                  title="Edit"
                                >✏️</button>
                                <button
                                  class="btn-delete"
                                  onClick={() => handleDeleteChore(chore.id, 'one_time', chore.name)}
                                  title="Delete"
                                >×</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                class="btn btn-outline add-chore-toggle"
                onClick={() => {
                  if (showAddChoreForm && editingChoreId) {
                    // Cancel edit mode
                    resetChoreForm();
                  } else {
                    setShowAddChoreForm(!showAddChoreForm);
                    if (!showAddChoreForm) {
                      // Opening add form - reset edit state
                      setEditingChoreId(null);
                      setEditingChoreType(null);
                    }
                  }
                }}
              >
                {showAddChoreForm
                  ? (editingChoreId ? '✕ Cancel Edit' : '▼ Hide Add Chore')
                  : '+ Add Chore'}
              </button>

              {showAddChoreForm && (
                <div class="add-chore-form">
                  {/* Form Header */}
                  <h4 class="form-header">
                    {editingChoreId ? '✏️ Edit Chore' : '➕ New Chore'}
                  </h4>

                  {/* Chore Name */}
                  <div class="form-row">
                    <label>Chore Name</label>
                    <input
                      type="text"
                      value={addChoreName}
                      onInput={(e) => setAddChoreName((e.target as HTMLInputElement).value)}
                      placeholder="e.g., Feed the dog"
                      class="form-input"
                    />
                  </div>

                  {/* Points */}
                  <div class="form-row">
                    <label>Points</label>
                    <select
                      value={addChorePoints}
                      onChange={(e) => setAddChorePoints(e.currentTarget.value)}
                      class="form-select"
                    >
                      {[0,1,2,3,4,5,6,7,8,9,10].map(p => (
                        <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign To */}
                  <div class="form-row">
                    <label>Assign To</label>
                    <select
                      value={addChoreAssignedTo}
                      onChange={(e) => setAddChoreAssignedTo(e.currentTarget.value)}
                      class="form-select"
                    >
                      <option value="">Select kid...</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Recurring Toggle (disabled when editing - can't change type) */}
                  <div class="form-row recurring-toggle">
                    <label class={`checkbox-label ${editingChoreId ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={addChoreIsRecurring}
                        onChange={(e) => setAddChoreIsRecurring(e.currentTarget.checked)}
                        disabled={!!editingChoreId}
                      />
                      <span>Recurring chore</span>
                      {editingChoreId && <span class="edit-hint">(type cannot be changed)</span>}
                    </label>
                  </div>

                  {/* Recurring Days (show only if recurring) */}
                  {addChoreIsRecurring && (
                    <div class="form-row">
                      <label>Repeat on</label>
                      <div class="recurring-days-grid">
                        {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(day => {
                          const dayLabels: Record<string, string> = {
                            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
                          };
                          const isSelected = addChoreRecurringDays.includes(day);
                          return (
                            <label key={day} class={`day-checkbox ${isSelected ? 'selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.currentTarget.checked) {
                                    setAddChoreRecurringDays([...addChoreRecurringDays, day]);
                                  } else {
                                    setAddChoreRecurringDays(addChoreRecurringDays.filter(d => d !== day));
                                  }
                                }}
                              />
                              <span>{dayLabels[day]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Due Date (show only for one-time chores when editing) */}
                  {!addChoreIsRecurring && editingChoreType === 'one_time' && (
                    <div class="form-row">
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={addChoreDueDate}
                        onChange={(e) => setAddChoreDueDate(e.currentTarget.value)}
                        class="form-input"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    class="btn btn-primary add-chore-submit"
                    onClick={handleAddChore}
                    disabled={isAddingChore || !addChoreName.trim() || !addChoreAssignedTo}
                  >
                    {isAddingChore
                      ? (editingChoreId ? 'Saving...' : 'Adding...')
                      : editingChoreId
                        ? 'Save Changes'
                        : addChoreIsRecurring
                          ? 'Create Recurring Chore'
                          : 'Add Chore for Today'}
                  </button>

                  {addChoreIsRecurring && addChoreRecurringDays.length > 0 && (
                    <p class="recurring-hint">
                      📅 This chore will appear every {addChoreRecurringDays.map(d => {
                        const labels: Record<string, string> = {
                          mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
                          fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
                        };
                        return labels[d];
                      }).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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

      {/* Template-Specific Customization (chore overrides, kid assignments) */}
      {activeRotation && (() => {
        const activePreset = getPresetByKey(activeRotation.active_preset);
        return (
          <div class="customize-section">
            <button class="btn btn-outline" onClick={() => setShowCustomize(!showCustomize)} style={{ marginTop: "1rem", width: "100%" }}>
              {showCustomize ? `▼ Hide ${activePreset?.name || 'Template'} Customization` : `▶ Customize ${activePreset?.name || 'Template'}`}
            </button>

          {showCustomize && renderTemplateCustomizePanel(
            activeRotation, children, inlineChildSlots, setInlineChildSlots,
            choreOverrides, setChoreOverrides,
            handleSaveCustomizations, isSavingCustomizations,
            assignmentMode, setAssignmentMode,
            customAssignments, setCustomAssignments,
            customChores, showHiddenChores, setShowHiddenChores,
            dailyChores, setDailyChores,
            restDays, setRestDays,
            rotationPeriod, setRotationPeriod,
            showSchedulePreview, setShowSchedulePreview
          )}
          </div>
        );
      })()}

      {/* Family Custom Chores - Always visible, applies to ALL templates */}
      <div class="custom-chores-section">
        <h3>✨ Family Custom Chores</h3>
        <p class="section-desc">These chores appear in all templates and manual mode</p>

        <div class="custom-chores-list">
          {customChores.map(chore => (
            <div key={chore.key} class="chore-customize-row">
              <span class="chore-icon">{chore.icon || '✨'}</span>
              <span class="chore-name">{chore.name}</span>
              <span class="chore-points">{chore.points} pt{chore.points !== 1 ? 's' : ''}</span>
              <button class="btn-remove" onClick={() => setCustomChores(customChores.filter(c => c.key !== chore.key))}>×</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
            <input
              type="text"
              value={newChoreName}
              onInput={(e) => setNewChoreName((e.target as HTMLInputElement).value)}
              placeholder="New chore name"
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', minWidth: '80px' }}
            />
            <select
              value={newChorePoints}
              onChange={(e) => setNewChorePoints(e.currentTarget.value)}
              style={{ padding: '0.25rem 0.5rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              {[0,1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>)}
            </select>
            <button
              class="btn btn-outline"
              onClick={handleAddCustomChore}
              disabled={!newChoreName.trim()}
              style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem' }}
            >
              + Add
            </button>
          </div>
        </div>

        <button
          class="btn btn-primary"
          onClick={handleSaveCustomChoresOnly}
          disabled={isSavingCustomizations}
          style={{ marginTop: "1rem" }}
        >
          {isSavingCustomizations ? 'Saving...' : 'Save Custom Chores'}
        </button>
      </div>

      {/* Slot Assignment Modal */}
      {showRotationModal && selectedPreset && (
        <div class="modal-overlay">
          <div class="modal">
            <ModalHeader
              title={`Set Up ${getPresetByKey(selectedPreset)?.name || 'Template'}`}
              onBack={() => setShowRotationModal(false)}
              onSubmit={handleApplyRotation}
              submitLabel={isApplyingRotation ? 'Applying...' : 'Activate Template'}
              isSubmitting={isApplyingRotation}
            />
            {renderSlotMapping(selectedPreset, children, childSlots, setChildSlots)}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && lockedTemplate && (
        <div class="modal-overlay">
          <div class="modal">
            <ModalHeader
              title={`${lockedTemplate.icon} ${lockedTemplate.name}`}
              onBack={() => setShowUpgradeModal(false)}
              submitLabel="Enter Gift Code"
              submitHref="/redeem"
              backLabel="Not Now"
            />
            <p class="template-desc">{lockedTemplate.description}</p>
            <p class="gated-notice">This template is part of <strong>Family Plan</strong>.</p>
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

// Template-specific customization panel with assignment mode toggle
// Custom chores are now family-level and shown separately
function renderTemplateCustomizePanel(
  activeRotation: RotationConfig, children: any[], inlineChildSlots: Record<string, string>,
  setInlineChildSlots: (s: Record<string, string>) => void,
  choreOverrides: Record<string, any>, setChoreOverrides: (o: Record<string, any>) => void,
  handleSaveCustomizations: () => Promise<void>,
  isSaving: boolean,
  assignmentMode: 'rotation' | 'custom',
  setAssignmentMode: (mode: 'rotation' | 'custom') => void,
  customAssignments: Record<string, string[]>,
  setCustomAssignments: (a: Record<string, string[]>) => void,
  customChores: CustomChore[],
  showHiddenChores: boolean,
  setShowHiddenChores: (show: boolean) => void,
  dailyChores: string[],
  setDailyChores: (chores: string[]) => void,
  restDays: string[],
  setRestDays: (days: string[]) => void,
  rotationPeriod: 1 | 2,
  setRotationPeriod: (period: 1 | 2) => void,
  showSchedulePreview: boolean,
  setShowSchedulePreview: (show: boolean) => void
) {
  const preset = getPresetByKey(activeRotation.active_preset);
  if (!preset) return null;

  const slots = getPresetSlots(preset);
  const isDynamic = preset.is_dynamic;

  // Get all enabled chores (preset + family custom)
  const enabledChores = preset.chores.filter(c => choreOverrides[c.key]?.enabled !== false);
  const hiddenChores = preset.chores.filter(c => choreOverrides[c.key]?.enabled === false);

  // Combine preset chores with family custom chores for assignment grid
  const allChoresForAssignment = [
    ...enabledChores,
    ...customChores.map(c => ({ ...c, icon: c.icon || '✨', minutes: 5, category: 'custom' }))
  ];

  // For slot-based templates, track which kids are already assigned to other slots
  const getUsedIdsExcludingSlot = (currentSlot: string) =>
    Object.entries(inlineChildSlots)
      .filter(([slot]) => slot !== currentSlot)
      .map(([_, id]) => id)
      .filter(Boolean);

  // Toggle chore assignment for a kid
  const toggleChoreAssignment = (kidId: string, choreKey: string) => {
    const current = customAssignments[kidId] || [];
    const newAssignments = current.includes(choreKey)
      ? current.filter(k => k !== choreKey)
      : [...current, choreKey];
    setCustomAssignments({ ...customAssignments, [kidId]: newAssignments });
  };

  // Calculate daily points for a kid
  const getKidPoints = (kidId: string) => {
    const assignments = customAssignments[kidId] || [];
    return assignments.reduce((total, choreKey) => {
      const chore = allChoresForAssignment.find(c => c.key === choreKey);
      const override = choreOverrides[choreKey];
      return total + (override?.points ?? chore?.points ?? 0);
    }, 0);
  };

  return (
    <div class="customize-content">
      {/* Assignment Mode Toggle */}
      <h4>How should chores be assigned?</h4>
      <div class="assignment-mode-toggle">
        <label class={`mode-option ${assignmentMode === 'rotation' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="assignment-mode-choice"
            checked={assignmentMode === 'rotation'}
            onChange={() => setAssignmentMode('rotation')}
          />
          <div class="mode-info">
            <strong>🔄 Smart Rotation</strong>
            <span>Kids rotate through chores each week automatically</span>
          </div>
        </label>
        <label class={`mode-option ${assignmentMode === 'custom' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="assignment-mode-choice"
            checked={assignmentMode === 'custom'}
            onChange={() => setAssignmentMode('custom')}
          />
          <div class="mode-info">
            <strong>✋ I'll Choose</strong>
            <span>Assign specific chores to each kid</span>
          </div>
        </label>
      </div>

      {/* Kid Slot Assignment (only show for rotation mode) */}
      {assignmentMode === 'rotation' && (
        <>
          <h4 style={{ marginTop: "1.5rem" }}>Kid Assignment</h4>
          {isDynamic ? (
            <div class="dynamic-kid-customize">
              <p class="slot-hint">Select which kids participate in this template:</p>
              <div class="dynamic-kid-list">
                {children.map(child => {
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
        </>
      )}

      {/* Custom Assignment Grid (only show for custom mode) */}
      {assignmentMode === 'custom' && (
        <>
          <h4 style={{ marginTop: "1.5rem" }}>Assign Chores to Kids</h4>
          <p class="slot-hint">Check which chores each kid should do daily</p>

          {/* Assignment Grid */}
          <div class="assignment-grid" style={{ '--kid-count': children.length } as any}>
            {/* Header row with kid names */}
            <div class="grid-header" style={{ gridTemplateColumns: `1fr repeat(${children.length}, 60px)` }}>
              <span class="grid-chore-name">Chore</span>
              {children.map(child => (
                <span key={child.id} class="grid-kid-name">{child.name}</span>
              ))}
            </div>

            {/* Chore rows */}
            {allChoresForAssignment.map(chore => {
              const override = choreOverrides[chore.key] || {};
              const points = override.points ?? chore.points;
              return (
                <div key={chore.key} class="grid-row" style={{ gridTemplateColumns: `1fr repeat(${children.length}, 60px)` }}>
                  <span class="grid-chore-info">
                    <span class="chore-icon">{chore.icon}</span>
                    <span class="chore-name">{chore.name}</span>
                    <span class="chore-points-badge">{points}pt</span>
                  </span>
                  {children.map(child => {
                    const isAssigned = (customAssignments[child.id] || []).includes(chore.key);
                    return (
                      <label key={child.id} class="grid-checkbox">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => toggleChoreAssignment(child.id, chore.key)}
                        />
                      </label>
                    );
                  })}
                </div>
              );
            })}

            {/* Points summary row */}
            <div class="grid-footer" style={{ gridTemplateColumns: `1fr repeat(${children.length}, 60px)` }}>
              <span class="grid-chore-name" style={{ fontWeight: 600 }}>Daily Points</span>
              {children.map(child => (
                <span key={child.id} class="grid-kid-points">{getKidPoints(child.id)} pts</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Template Chores (enable/disable and point overrides) */}
      <h4 style={{ marginTop: "1.5rem" }}>Active Chores</h4>
      <p class="slot-hint">Enable/disable or adjust point values for this template's chores</p>
      <div class="chore-customize-list">
        {enabledChores.map(chore => {
          const override = choreOverrides[chore.key] || {};
          const points = override.points ?? chore.points;
          return (
            <div key={chore.key} class="chore-customize-row">
              <label class="chore-enable">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={(e) => setChoreOverrides({ ...choreOverrides, [chore.key]: { ...override, enabled: e.currentTarget.checked } })}
                />
                <span class="chore-icon">{chore.icon}</span>
                <span class="chore-name">{chore.name}</span>
              </label>
              <select
                value={points}
                onChange={(e) => setChoreOverrides({ ...choreOverrides, [chore.key]: { ...override, points: parseInt(e.currentTarget.value) } })}
                class="chore-points-select"
              >
                {[0,1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>{p} pt{p !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      {/* Hidden Chores (collapsible section) */}
      {hiddenChores.length > 0 && (
        <div class="hidden-chores-section">
          <button
            class="btn-toggle-hidden"
            onClick={() => setShowHiddenChores(!showHiddenChores)}
          >
            {showHiddenChores ? '▼' : '▶'} {hiddenChores.length} hidden chore{hiddenChores.length !== 1 ? 's' : ''}
          </button>

          {showHiddenChores && (
            <div class="hidden-chores-list">
              <p class="slot-hint">Check to re-enable a chore</p>
              {hiddenChores.map(chore => {
                const override = choreOverrides[chore.key] || {};
                const points = override.points ?? chore.points;
                return (
                  <div key={chore.key} class="chore-customize-row disabled">
                    <label class="chore-enable">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={(e) => setChoreOverrides({ ...choreOverrides, [chore.key]: { ...override, enabled: e.currentTarget.checked } })}
                      />
                      <span class="chore-icon">{chore.icon}</span>
                      <span class="chore-name">{chore.name}</span>
                    </label>
                    <span class="chore-points">{points} pt{points !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Daily Chores Section - Only show for rotation mode */}
      {assignmentMode === 'rotation' && (
        <div class="daily-chores-toggle-section">
          <h4 style={{ marginTop: "1.5rem" }}>📅 Daily Chores (Every Day)</h4>
          <p class="slot-hint">Check chores that should appear every day for all kids, regardless of the rotation schedule</p>

          <div class="daily-chores-list">
            {/* Enabled preset chores */}
            {enabledChores.map(chore => {
              const override = choreOverrides[chore.key] || {};
              const points = override.points ?? chore.points;
              const isDaily = dailyChores.includes(chore.key);
              return (
                <label key={chore.key} class={`daily-chore-row ${isDaily ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isDaily}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setDailyChores([...dailyChores, chore.key]);
                      } else {
                        setDailyChores(dailyChores.filter(k => k !== chore.key));
                      }
                    }}
                  />
                  <span class="chore-icon">{chore.icon}</span>
                  <span class="chore-name">{chore.name}</span>
                  <span class="chore-points-badge">{points}pt</span>
                </label>
              );
            })}

            {/* Family custom chores */}
            {customChores.map(chore => {
              const isDaily = dailyChores.includes(chore.key);
              return (
                <label key={chore.key} class={`daily-chore-row ${isDaily ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isDaily}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setDailyChores([...dailyChores, chore.key]);
                      } else {
                        setDailyChores(dailyChores.filter(k => k !== chore.key));
                      }
                    }}
                  />
                  <span class="chore-icon">{chore.icon || '✨'}</span>
                  <span class="chore-name">{chore.name}</span>
                  <span class="chore-points-badge">{chore.points}pt</span>
                </label>
              );
            })}
          </div>

          {dailyChores.length > 0 && (
            <p class="daily-chores-summary">
              ✓ {dailyChores.length} chore{dailyChores.length !== 1 ? 's' : ''} will appear every day for all kids
            </p>
          )}
        </div>
      )}

      {/* Rotation Frequency Section - Only show for templates with multiple week types */}
      {assignmentMode === 'rotation' && preset.week_types.length > 1 && (
        <div class="rotation-frequency-section">
          <h4 style={{ marginTop: "1.5rem" }}>🔄 Rotation Frequency</h4>
          <p class="slot-hint">How often should kids swap chores?</p>

          <div class="rotation-frequency-options">
            <label class={`frequency-option ${rotationPeriod === 1 ? 'selected' : ''}`}>
              <input
                type="radio"
                name="rotation-frequency"
                checked={rotationPeriod === 1}
                onChange={() => setRotationPeriod(1)}
              />
              <span class="frequency-label">Weekly</span>
              <span class="frequency-desc">Swap chores each week</span>
            </label>
            <label class={`frequency-option ${rotationPeriod === 2 ? 'selected' : ''}`}>
              <input
                type="radio"
                name="rotation-frequency"
                checked={rotationPeriod === 2}
                onChange={() => setRotationPeriod(2)}
              />
              <span class="frequency-label">Biweekly</span>
              <span class="frequency-desc">Keep same chores for 2 weeks</span>
            </label>
          </div>
        </div>
      )}

      {/* Rest Days Section - Only show for rotation mode */}
      {assignmentMode === 'rotation' && (
        <div class="rest-days-section">
          <h4 style={{ marginTop: "1.5rem" }}>🛋️ Rest Days (No Chores)</h4>
          <p class="slot-hint">Select days when kids get a break from chores</p>

          <div class="rest-days-grid">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(day => {
              const dayLabels: Record<string, string> = {
                mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
              };
              const isRest = restDays.includes(day);
              return (
                <label key={day} class={`rest-day-checkbox ${isRest ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isRest}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setRestDays([...restDays, day]);
                      } else {
                        setRestDays(restDays.filter(d => d !== day));
                      }
                    }}
                  />
                  <span>{dayLabels[day]}</span>
                </label>
              );
            })}
          </div>

          {restDays.length > 0 && (
            <p class="rest-days-summary">
              🛋️ No chores on {restDays.map(d => {
                const labels: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
                return labels[d];
              }).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Schedule Preview - Only show for rotation mode */}
      {assignmentMode === 'rotation' && (() => {
        // Build child names map for preview
        const childNames: Record<string, string> = {};
        children.forEach(child => {
          childNames[child.id] = child.name;
        });

        // Build a preview config with current state
        const previewConfig: RotationConfig = {
          ...activeRotation,
          child_slots: Object.entries(inlineChildSlots)
            .filter(([_, id]) => id)
            .map(([slot, profile_id]) => ({ slot, profile_id })),
          customizations: {
            ...activeRotation.customizations,
            chore_overrides: choreOverrides,
            daily_chores: dailyChores,
            rest_days: restDays as any,
            rotation_period_weeks: rotationPeriod,
          },
        };

        const previews = getSchedulePreview(previewConfig, childNames, customChores);
        const hasEmptyDays = previews.some(p => p.hasEmptyDays);

        // Get child names in order of slots
        const assignedChildNames = Object.values(inlineChildSlots)
          .filter(id => id)
          .map(id => children.find(c => c.id === id)?.name || 'Unknown');

        return (
          <>
            <SchedulePreviewTable
              previews={previews}
              childNames={assignedChildNames}
              collapsed={!showSchedulePreview}
              onToggleCollapse={() => setShowSchedulePreview(!showSchedulePreview)}
            />

            {hasEmptyDays && showSchedulePreview && (
              <div class="empty-days-notice">
                <p><strong>Some days have no scheduled chores.</strong></p>
                <p class="notice-hint">
                  This is okay if intentional (e.g., "We take Sundays off").
                  Consider adding Daily Chores above if you want chores every day.
                </p>
              </div>
            )}
          </>
        );
      })()}

      <div class="customize-actions">
        <button class="btn btn-primary" onClick={handleSaveCustomizations} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Template Settings'}
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
  .chore-points-select { padding: 0.25rem 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem; min-width: 70px; flex-shrink: 0; }
  .btn-remove { background: none; border: none; color: var(--color-warning); font-size: 1.25rem; cursor: pointer; padding: 0 0.25rem; }
  .add-chore-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
  .add-chore-input { flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; }
  .customize-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .custom-chores-section { margin-top: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 2px solid #f59e0b; }
  .custom-chores-section h3 { margin: 0 0 0.25rem; font-size: 1.1rem; color: #92400e; }
  .custom-chores-section .section-desc { margin-bottom: 1rem; color: #a16207; }
  .custom-chores-section .custom-chores-list { background: white; padding: 1rem; border-radius: 8px; }

  /* Assignment Mode Toggle */
  .assignment-mode-toggle { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .mode-option { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .mode-option:hover { border-color: var(--color-primary); }
  .mode-option.selected { border-color: var(--color-primary); background: #f0fdf4; }
  .mode-option input { margin-top: 0.25rem; width: 18px; height: 18px; accent-color: var(--color-primary); }
  .mode-info { display: flex; flex-direction: column; gap: 0.25rem; }
  .mode-info strong { font-size: 0.95rem; }
  .mode-info span { font-size: 0.8rem; color: var(--color-text-light); }

  /* Assignment Grid */
  .assignment-grid { background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .grid-header, .grid-row, .grid-footer { display: grid; grid-template-columns: 1fr repeat(var(--kid-count, 2), 60px); gap: 0.5rem; padding: 0.5rem 0.75rem; align-items: center; }
  .grid-header { background: #f9fafb; font-weight: 600; font-size: 0.8rem; color: var(--color-text-light); border-bottom: 2px solid #e5e7eb; }
  .grid-row { border-bottom: 1px solid #f3f4f6; }
  .grid-row:last-of-type { border-bottom: none; }
  .grid-footer { background: #f0fdf4; border-top: 2px solid #e5e7eb; font-weight: 600; }
  .grid-chore-name { text-align: left; }
  .grid-kid-name, .grid-kid-points { text-align: center; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grid-chore-info { display: flex; align-items: center; gap: 0.5rem; }
  .chore-points-badge { font-size: 0.7rem; background: #e5e7eb; padding: 0.1rem 0.35rem; border-radius: 4px; color: var(--color-text-light); margin-left: auto; }
  .grid-checkbox { display: flex; justify-content: center; cursor: pointer; }
  .grid-checkbox input { width: 20px; height: 20px; accent-color: var(--color-primary); cursor: pointer; }

  /* Hidden Chores Section */
  .hidden-chores-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .btn-toggle-hidden { background: none; border: none; color: var(--color-text-light); cursor: pointer; font-size: 0.9rem; padding: 0.5rem 0; text-align: left; width: 100%; }
  .btn-toggle-hidden:hover { color: var(--color-text); }
  .hidden-chores-list { margin-top: 0.75rem; padding: 0.75rem; background: #f9fafb; border-radius: 8px; border: 1px dashed #e5e7eb; }

  /* Daily Chores Toggle Section */
  .daily-chores-toggle-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .daily-chores-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .daily-chore-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: white; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
  .daily-chore-row:hover { border-color: #3b82f6; }
  .daily-chore-row.selected { border-color: #3b82f6; background: #eff6ff; }
  .daily-chore-row input { width: 18px; height: 18px; accent-color: #3b82f6; }
  .daily-chores-summary { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: #eff6ff; border-radius: 6px; font-size: 0.85rem; color: #1d4ed8; }

  /* Empty Days Notice */
  .empty-days-notice { margin-top: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; }
  .empty-days-notice p { margin: 0 0 0.5rem; font-size: 0.9rem; color: #92400e; }
  .empty-days-notice p:last-child { margin-bottom: 0; }
  .empty-days-notice .notice-hint { font-size: 0.8rem; color: #a16207; }

  /* Rotation Frequency Section */
  .rotation-frequency-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .rotation-frequency-options { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .frequency-option { display: flex; flex-direction: column; padding: 0.75rem 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; min-width: 140px; }
  .frequency-option:hover { border-color: #10b981; }
  .frequency-option.selected { border-color: #10b981; background: #ecfdf5; }
  .frequency-option input { position: absolute; opacity: 0; }
  .frequency-label { font-weight: 600; font-size: 0.9rem; color: #064e3b; }
  .frequency-desc { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
  .frequency-option.selected .frequency-label { color: #047857; }

  /* Rest Days Section */
  .rest-days-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .rest-days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .rest-day-checkbox { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: white; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; min-width: 70px; justify-content: center; }
  .rest-day-checkbox:hover { border-color: #8b5cf6; }
  .rest-day-checkbox.selected { border-color: #8b5cf6; background: #f5f3ff; }
  .rest-day-checkbox input { width: 16px; height: 16px; accent-color: #8b5cf6; }
  .rest-days-summary { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: #f5f3ff; border-radius: 6px; font-size: 0.85rem; color: #6d28d9; }

  /* Manual Mode Card */
  .manual-mode-card { display: flex; flex-direction: column; }
  .manual-mode-card .manual-header { display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; }
  .manual-mode-card .manual-header input { margin-top: 0.25rem; }

  /* Inline Add Chore Form (Manual Mode) */
  .manual-add-chore-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  .loading-hint { font-size: 0.85rem; color: var(--color-text-light); text-align: center; padding: 0.5rem; }
  .existing-chores-section { margin-bottom: 1rem; }
  .existing-chores-section h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #374151; }
  .chores-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .chore-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
  .chore-item .chore-info { display: flex; flex-direction: column; gap: 0.125rem; flex: 1; min-width: 0; }
  .chore-item .chore-name { font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chore-item .chore-meta { font-size: 0.75rem; color: var(--color-text-light); }
  .chore-actions { display: flex; gap: 0.25rem; align-items: center; flex-shrink: 0; }
  .btn-edit { background: none; border: none; font-size: 0.9rem; cursor: pointer; padding: 0.25rem 0.4rem; border-radius: 4px; transition: all 0.2s; }
  .btn-edit:hover { background: #dbeafe; }
  .btn-delete { background: none; border: none; color: #9ca3af; font-size: 1.25rem; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 4px; transition: all 0.2s; flex-shrink: 0; }
  .btn-delete:hover { background: #fee2e2; color: #dc2626; }
  .add-chore-toggle { width: 100%; justify-content: center; }
  .add-chore-form { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .add-chore-form .form-header { margin: 0 0 0.5rem; font-size: 1rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
  .form-row { display: flex; flex-direction: column; gap: 0.25rem; }
  .form-row label { font-size: 0.85rem; font-weight: 500; color: #374151; }
  .form-input { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.9rem; }
  .form-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1); }
  .form-select { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.9rem; background: white; }
  .checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
  .checkbox-label input { width: 18px; height: 18px; accent-color: var(--color-primary); }
  .checkbox-label.disabled { opacity: 0.6; cursor: not-allowed; }
  .checkbox-label .edit-hint { font-size: 0.75rem; color: #9ca3af; margin-left: 0.25rem; }
  .recurring-toggle { padding-top: 0.5rem; border-top: 1px solid #e5e7eb; }
  .recurring-days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .day-checkbox { display: flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.6rem; background: white; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
  .day-checkbox:hover { border-color: var(--color-primary); }
  .day-checkbox.selected { border-color: var(--color-primary); background: #f0fdf4; }
  .day-checkbox input { width: 14px; height: 14px; accent-color: var(--color-primary); }
  .add-chore-submit { margin-top: 0.5rem; }
  .recurring-hint { margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: #f0fdf4; border-radius: 6px; font-size: 0.8rem; color: #166534; }
`;

/**
 * Family Settings - PIN management and theme selection
 */

import { useState } from "preact/hooks";
import ParentPinGate from "./ParentPinGate.tsx";

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
  const [selectedTheme, setSelectedTheme] = useState(settings.theme || "fresh_meadow");
  const [isUpdatingPins, setIsUpdatingPins] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentKid, setCurrentKid] = useState<{id: string, name: string} | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);

  const children = members.filter(member => member.role === "child");

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
      
      const apiEndpoint = isParent ? '/api/parent/set-pin' : '/api/family/set-kid-pin';
      const requestBody = isParent 
        ? { pin: pin }
        : { kid_id: kidId, pin: pin };
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log(`🔧 PIN API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔧 PIN API error: ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log('✅ PIN saved successfully:', result);
      
      if (isParent) {
        console.log(`🔐 Parent PIN saved to database for ${member.name}`);
      } else {
        console.log(`🔧 Kid PIN saved to database for ${member?.name}`);
      }
      
      return result.success || false;
    } catch (error) {
      console.error('❌ Error saving PIN:', error);
      return false;
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
          {[
            { id: "fresh_meadow", name: "Fresh Meadow", color: "#10b981" },
            { id: "sunset_citrus", name: "Sunset Citrus", color: "#f59e0b" },
            { id: "ocean_depth", name: "Ocean Depth", color: "#3b82f6" }
          ].map((theme) => (
            <div 
              key={theme.id}
              class={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTheme(theme.id);
                // TODO: Save to backend
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
              <button 
                class="btn btn-outline" 
                onClick={() => handleSetParentPin(parent.id, parent.name)}
                style={{ fontSize: "0.75rem" }}
              >
                {parent.pin_hash ? "Change PIN" : "Set PIN"}
              </button>
            </div>
          </div>
        ))}
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
/**
 * KidPinSection - Toggle and manage kid PIN security
 */

import { useState } from "preact/hooks";

interface KidPinSectionProps {
  family: {
    id: string;
    children_pins_enabled?: boolean;
  };
  members: Array<{
    id: string;
    name: string;
    role: string;
    has_pin?: boolean;
  }>;
  onSetPin: (member: { id: string; name: string; role: string }) => void;
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

export default function KidPinSection({ family, members, onSetPin }: KidPinSectionProps) {
  const initialState = family?.children_pins_enabled || false;
  const localStorageKey = `family_pins_enabled_${family?.id}`;

  const [pinsEnabled, setPinsEnabled] = useState(initialState);
  const [isUpdatingPins, setIsUpdatingPins] = useState(false);

  const childMembers = members.filter(member => member.role === "child");

  const handleToggle = async (e: Event) => {
    const newState = (e.currentTarget as HTMLInputElement).checked;
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
      (e.currentTarget as HTMLInputElement).checked = pinsEnabled;
    }

    setIsUpdatingPins(false);
  };

  return (
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
            onChange={handleToggle}
            disabled={isUpdatingPins}
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      {pinsEnabled && childMembers.length > 0 && (
        <div class="pin-management">
          <h4>Manage Kid PINs</h4>
          {childMembers.map((child) => (
            <div key={child.id} class="pin-child-item">
              <span class="child-name">{child.name}</span>
              <button
                type="button"
                class="btn-secondary"
                onClick={() => onSetPin({ id: child.id, name: child.name, role: 'child' })}
              >
                {child.has_pin ? 'Change PIN' : 'Set PIN'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

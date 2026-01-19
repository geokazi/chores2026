/**
 * PinSetupModal - Shared PIN entry modal for both kids and parents
 */

import { useState } from "preact/hooks";

interface PinSetupModalProps {
  isOpen: boolean;
  member: { id: string; name: string; role: string } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PinSetupModal({ isOpen, member, onClose, onSaved }: PinSetupModalProps) {
  const [pinEntry, setPinEntry] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);

  if (!isOpen || !member) return null;

  const savePinForMember = async (memberId: string, pin: string, isParent: boolean): Promise<boolean> => {
    try {
      console.log(`🔧 Saving PIN for ${isParent ? 'parent' : 'kid'} ${memberId}:`, pin.replace(/./g, '*'));

      if (isParent) {
        // For parents, use plaintext storage for instant verification
        const response = await fetch(`/api/parent/setup-pin-simple`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: memberId, pin: pin }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`🔧 Parent PIN API error: ${errorText}`);
          return false;
        }

        const result = await response.json();
        console.log('✅ Parent PIN saved successfully:', result);
        return result.success || false;
      } else {
        // For kids, use existing API
        const response = await fetch('/api/family/set-kid-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kid_id: memberId, pin: pin }),
        });

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

  const handleConfirm = async () => {
    if (pinEntry.length === 4) {
      setIsSettingPin(true);
      const isParent = member.role === 'parent';
      console.log(`🔧 Saving PIN for ${member.name} with PIN: ${pinEntry.replace(/./g, '*')}`);

      const success = await savePinForMember(member.id, pinEntry, isParent);
      console.log(`🔧 PIN save result: ${success}`);
      setIsSettingPin(false);

      if (success) {
        setPinEntry("");
        onClose();
        onSaved();
      } else {
        // Clear PIN on error and let user try again
        setPinEntry("");
      }
    }
  };

  const handleClose = () => {
    setPinEntry("");
    setIsSettingPin(false);
    onClose();
  };

  const isParent = member.role === 'parent';
  const title = isParent ? `🔐 ${member.name}'s PIN` : `👶 ${member.name}'s PIN`;

  return (
    <div class="pin-modal-overlay">
      <div class="pin-modal">
        <h3>{title}</h3>
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
            onClick={handleConfirm}
            disabled={pinEntry.length !== 4 || isSettingPin}
          >
            ✓
          </button>
        </div>

        <button
          type="button"
          class="pin-cancel"
          onClick={handleClose}
          disabled={isSettingPin}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

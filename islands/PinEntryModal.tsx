/**
 * PIN Entry Modal
 * Simple 4-digit PIN entry for kid access
 */

import { useEffect, useState } from "preact/hooks";
// @ts-ignore: bcrypt types not compatible with Deno 2
import * as bcrypt from "bcryptjs";
import { createKidSession, KidProfile } from "../lib/auth/kid-session.ts";
import { trackInteraction } from "../lib/utils/track-interaction.ts";

interface FamilyMember {
  id: string;
  name: string;
  pin_hash?: string;
}

interface Props {
  kid: FamilyMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PinEntryModal({ kid, onSuccess, onCancel }: Props) {
  console.log("🔍 PinEntryModal opened for kid:", kid.name, "- This is for LOGIN, not setting PINs");
  
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      // Auto-validate when 4 digits entered
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const validatePin = async (enteredPin: string) => {
    setIsValidating(true);
    setError("");

    console.log("🔧 PIN validation started for kid:", kid.name);
    console.log("🔧 Entered PIN:", enteredPin.replace(/./g, '*'));
    console.log("🔧 Kid has pin_hash:", !!kid.pin_hash);

    try {
      // Check localStorage first (instant access)
      const localHash = localStorage.getItem(`kid_pin_${kid.id}`);
      console.log("🔧 localStorage hash:", localHash ? "EXISTS" : "NOT_FOUND");
      
      if (localHash && localHash !== "SET" && localHash.startsWith('$')) {
        console.log("🔧 Comparing against localStorage hash");
        const isValid = await bcrypt.compare(enteredPin, localHash);
        console.log("🔧 localStorage validation result:", isValid);
        if (isValid) {
          trackInteraction("pin_attempt", { success: true, type: "kid" });
          // Create kid session for validated access
          const kidProfile: KidProfile = {
            id: kid.id,
            name: kid.name,
            role: 'child',
            family_id: '', // Will be set by server
            pin_hash: localHash,
          };
          createKidSession(kidProfile);

          onSuccess();
          return;
        }
      }

      // Clear invalid localStorage entry
      if (localHash === "SET") {
        console.log("🔧 Clearing invalid localStorage entry");
        localStorage.removeItem(`kid_pin_${kid.id}`);
      }

      // Check database pin_hash (cross-device)
      if (kid.pin_hash) {
        console.log("🔧 Comparing against database pin_hash");
        console.log("🔧 Database pin_hash format:", kid.pin_hash.substring(0, 10) + "...");
        try {
          const isValid = await bcrypt.compare(enteredPin, kid.pin_hash);
          console.log("🔧 Database validation result:", isValid);
          if (isValid) {
            // Cache in localStorage for next time
            localStorage.setItem(`kid_pin_${kid.id}`, kid.pin_hash);
            
            // Create kid session for validated access
            const kidProfile: KidProfile = {
              id: kid.id,
              name: kid.name,
              role: 'child',
              family_id: '', // Will be set by server
              pin_hash: kid.pin_hash,
            };
            createKidSession(kidProfile);
            
            onSuccess();
            return;
          }
        } catch (error) {
          console.error("🔧 Database bcrypt comparison error:", error);
        }
      }

      // No PIN set - first time setup
      if (!kid.pin_hash && !localHash) {
        // Set up new PIN
        // @ts-ignore: bcrypt types expect string but number (salt rounds) is correct
        const hash = await bcrypt.hash(enteredPin, 10);
        localStorage.setItem(`kid_pin_${kid.id}`, hash);

        // Save to database too
        await fetch(`/api/kids/${kid.id}/pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin_hash: hash }),
        });

        // Create kid session for new PIN setup
        const kidProfile: KidProfile = {
          id: kid.id,
          name: kid.name,
          role: 'child',
          family_id: '', // Will be set by server
          pin_hash: hash,
        };
        createKidSession(kidProfile);

        onSuccess();
        return;
      }

      // Invalid PIN
      console.log("❌ PIN validation failed - incorrect PIN");
      trackInteraction("pin_attempt", { success: false, type: "kid" });
      setError("Incorrect PIN. Try again.");
      setPin("");
    } catch (error) {
      console.error("❌ PIN validation error:", error);
      setError("Error validating PIN");
      setPin("");
    } finally {
      setIsValidating(false);
    }
  };

  const renderPinDots = () => {
    return Array.from({ length: 4 }, (_, i) => (
      <div
        key={i}
        class={`pin-dot ${i < pin.length ? "filled" : ""}`}
      >
        {i < pin.length && "●"}
      </div>
    ));
  };

  const keypadNumbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["←", "0", "✓"],
  ];

  const handleKeypadPress = (key: string) => {
    if (key === "←") {
      handleBackspace();
    } else if (key === "✓") {
      if (pin.length === 4) {
        validatePin(pin);
      }
    } else if (key >= "0" && key <= "9") {
      handleKeyPress(key);
    }
  };

  // Handle physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pin.length === 4) {
        validatePin(pin);
      } else if (e.key === "Escape") {
        onCancel();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  return (
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>👧 {kid.name}'s PIN</h2>
          {!kid.pin_hash && (
            <p
              style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}
            >
              Choose 4 numbers you'll remember
            </p>
          )}
        </div>

        <div class="pin-display">
          {renderPinDots()}
        </div>

        {error && (
          <div
            style={{
              color: "var(--color-warning)",
              textAlign: "center",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {isValidating && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--color-text-light)",
            }}
          >
            Validating...
          </div>
        )}

        <div class="pin-keypad">
          {keypadNumbers.flat().map((key) => (
            <button
              key={key}
              type="button"
              class="pin-key"
              onClick={() => handleKeypadPress(key)}
              disabled={isValidating}
              style={{
                backgroundColor: key === "✓" && pin.length === 4
                  ? "var(--color-primary)"
                  : undefined,
                color: key === "✓" && pin.length === 4 ? "white" : undefined,
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-light)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: var(--color-card);
          border-radius: 16px;
          padding: 2rem;
          max-width: 360px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .modal-header h2 {
          margin: 0 0 0.5rem 0;
          color: var(--color-text);
          font-size: 1.5rem;
        }

        .pin-display {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .pin-dot {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: var(--color-primary);
          transition: all 0.2s ease;
        }

        .pin-dot.filled {
          background: var(--color-primary);
          color: white;
          transform: scale(1.1);
        }

        .pin-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .pin-key {
          width: 60px;
          height: 60px;
          border: 2px solid var(--color-primary);
          border-radius: 12px;
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 1.5rem;
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .pin-key:active {
          transform: translateY(0);
        }

        .pin-key:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .modal {
            padding: 1.5rem;
          }

          .pin-key {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }

          .pin-display {
            gap: 0.75rem;
          }

          .pin-dot {
            width: 16px;
            height: 16px;
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

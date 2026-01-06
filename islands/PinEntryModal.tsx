/**
 * PIN Entry Modal
 * Simple 4-digit PIN entry for kid access
 */

import { useEffect, useState } from "preact/hooks";
// @ts-ignore: bcrypt types not compatible with Deno 2
import * as bcrypt from "bcryptjs";

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

    try {
      // Check localStorage first (instant access)
      const localHash = localStorage.getItem(`kid_pin_${kid.id}`);
      if (localHash) {
        const isValid = await bcrypt.compare(enteredPin, localHash);
        if (isValid) {
          onSuccess();
          return;
        }
      }

      // Check database pin_hash (cross-device)
      if (kid.pin_hash) {
        const isValid = await bcrypt.compare(enteredPin, kid.pin_hash);
        if (isValid) {
          // Cache in localStorage for next time
          localStorage.setItem(`kid_pin_${kid.id}`, kid.pin_hash);
          onSuccess();
          return;
        }
      }

      // No PIN set - first time setup
      if (!kid.pin_hash && !localHash) {
        // Set up new PIN
        const hash = await bcrypt.hash(enteredPin, 10);
        localStorage.setItem(`kid_pin_${kid.id}`, hash);

        // Save to database too
        await fetch(`/api/kids/${kid.id}/pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin_hash: hash }),
        });

        onSuccess();
        return;
      }

      // Invalid PIN
      setError("Incorrect PIN. Try again.");
      setPin("");
    } catch (error) {
      console.error("PIN validation error:", error);
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
    </div>
  );
}

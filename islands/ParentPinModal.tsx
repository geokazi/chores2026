/**
 * Parent PIN Verification Modal
 * Simplified PIN entry specifically for parent authentication
 * Reuses styling from existing PinEntryModal but with parent-specific logic
 */

import { useEffect, useState } from "preact/hooks";
// @ts-ignore: bcrypt types not compatible with Deno 2
import * as bcrypt from "bcryptjs";
import { createParentSession, ParentProfile } from "../lib/auth/parent-session.ts";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  pin_hash?: string;
  has_pin?: boolean; // Session provides this boolean (pin_hash is not exposed to client)
}

interface Props {
  parentName: string;
  operation: string;
  onSuccess: (enteredPin?: string) => void;
  onCancel: () => void;
  parentData: FamilyMember;
  forceChangePin?: boolean; // Force PIN change mode (for default PIN scenario)
  needsSetup?: boolean; // First-time PIN setup (no PIN exists yet)
}

export default function ParentPinModal({
  parentName,
  operation,
  onSuccess,
  onCancel,
  parentData,
  forceChangePin = false,
  needsSetup = false
}: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // First-time setup / PIN change modes
  // Start in setup_new if forceChangePin OR needsSetup (no PIN exists)
  const [setupMode, setSetupMode] = useState<'verify' | 'setup_new' | 'confirm_new'>(
    (forceChangePin || needsSetup) ? 'setup_new' : 'verify'
  );
  const [newPinToConfirm, setNewPinToConfirm] = useState("");

  // Reset mode when forceChangePin prop changes
  useEffect(() => {
    if (forceChangePin) {
      console.log("🔧 forceChangePin detected, switching to setup_new mode");
      setSetupMode('setup_new');
      setPin("");
      setNewPinToConfirm("");
      setError("");
    }
  }, [forceChangePin]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      // Auto-verify when 4 digits entered
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    setError("");

    console.log("🔧 Parent PIN validation started for:", parentName);
    console.log("🔧 Mode:", setupMode);
    console.log("🔧 Parent has PIN:", parentData.has_pin || !!parentData.pin_hash);

    try {
      // ========== SETUP_NEW MODE: First step of setting new PIN ==========
      if (setupMode === 'setup_new') {
        if (enteredPin === "1234") {
          setError("Cannot use default PIN 1234. Choose a different PIN.");
          setPin("");
          setIsVerifying(false);
          return;
        }
        console.log("🔧 New PIN entered, requiring confirmation");
        setNewPinToConfirm(enteredPin);
        setSetupMode('confirm_new');
        setPin("");
        setIsVerifying(false);
        return;
      }

      // ========== CONFIRM_NEW MODE: Confirm the new PIN ==========
      if (setupMode === 'confirm_new') {
        if (enteredPin !== newPinToConfirm) {
          console.log("❌ PIN confirmation mismatch");
          setError("PINs don't match. Try again.");
          setSetupMode('setup_new');
          setNewPinToConfirm("");
          setPin("");
          setIsVerifying(false);
          return;
        }

        console.log("🔧 PIN confirmed, saving to server");
        const setupResponse = await fetch('/api/parent/setup-pin-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: parentData.id,
            pin: enteredPin
          }),
        });

        if (setupResponse.ok) {
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            console.log("✅ Parent PIN set up successfully");
            const parentProfile: ParentProfile = {
              id: parentData.id,
              name: parentData.name,
              role: 'parent',
              family_id: '',
              pin_hash: enteredPin,
            };
            createParentSession(parentProfile);
            onSuccess(enteredPin);
            return;
          }
        }
        setError("Failed to save PIN. Try again.");
        setPin("");
        setIsVerifying(false);
        return;
      }

      // ========== VERIFY MODE: Normal PIN verification ==========
      console.log("🔧 Verifying PIN against server");
      const verifyResponse = await fetch('/api/parent/verify-pin-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentData.id,
          pin: enteredPin
        }),
      });

      console.log("🔧 Server verification response status:", verifyResponse.status);

      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        console.log("🔧 Server verification result:", result);

        if (result.success) {
          console.log("✅ Parent PIN verified successfully");
          const parentProfile: ParentProfile = {
            id: parentData.id,
            name: parentData.name,
            role: 'parent',
            family_id: '',
            pin_hash: parentData.pin_hash || 'verified',
          };
          createParentSession(parentProfile);
          onSuccess(enteredPin);
          return;
        }

        // SECURITY: Handle "No PIN set" - require setup flow
        if (result.message === 'No PIN set') {
          console.log("🔧 No PIN set - switching to setup mode");
          setError("No PIN set. Please create a new PIN.");
          setSetupMode('setup_new');
          setPin("");
          setIsVerifying(false);
          return;
        }

        // Handle legacy hash that needs re-setup (server returns specific message)
        if (result.message === 'PIN needs reset') {
          console.log("🔧 Server indicates PIN needs re-setup");
          setError("PIN needs to be reset. Enter a new PIN.");
          setSetupMode('setup_new');
          setPin("");
          setIsVerifying(false);
          return;
        }
      }

      // Invalid PIN
      console.log("❌ Parent PIN validation failed - incorrect PIN");
      setError("Incorrect PIN. Try again.");
      setPin("");
    } catch (error) {
      console.error("❌ Parent PIN validation error:", error);
      setError("Error verifying PIN");
      setPin("");
    } finally {
      setIsVerifying(false);
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
        verifyPin(pin);
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
        verifyPin(pin);
      } else if (e.key === "Escape") {
        onCancel();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  // Get header text based on mode
  const getHeaderText = () => {
    if (setupMode === 'setup_new') {
      if (forceChangePin) {
        return { title: "🔒 Change Your PIN", subtitle: "Enter a new 4-digit PIN (not 1234)" };
      }
      if (needsSetup) {
        return { title: "🔐 Set Up Your PIN", subtitle: "Create a 4-digit PIN to secure settings" };
      }
      return { title: "🔐 Create Your PIN", subtitle: "Enter a new 4-digit PIN (not 1234)" };
    }
    if (setupMode === 'confirm_new') {
      return { title: "🔐 Confirm Your PIN", subtitle: "Enter the same PIN again to confirm" };
    }
    return { title: "🔐 Parent PIN Required", subtitle: `Enter your PIN to ${operation}` };
  };

  const headerText = getHeaderText();

  return (
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>{headerText.title}</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            {headerText.subtitle}
          </p>
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

        {isVerifying && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--color-text-light)",
            }}
          >
            Verifying...
          </div>
        )}

        <div class="pin-keypad">
          {keypadNumbers.flat().map((key) => (
            <button
              key={key}
              type="button"
              class="pin-key"
              onClick={() => handleKeypadPress(key)}
              disabled={isVerifying}
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
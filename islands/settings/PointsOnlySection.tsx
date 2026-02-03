/**
 * PointsOnlySection - Toggle to hide dollar displays
 * For parents who prefer points-based rewards without monetary conversion
 */

import { useState } from "preact/hooks";

interface PointsOnlySectionProps {
  initialEnabled: boolean;
}

export default function PointsOnlySection({ initialEnabled }: PointsOnlySectionProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings/points-only-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: newValue }),
      });

      if (!response.ok) {
        // Revert on failure
        setEnabled(!newValue);
        const result = await response.json();
        alert(`❌ Failed to save: ${result.error}`);
      }
    } catch (error) {
      // Revert on error
      setEnabled(!newValue);
      alert(`❌ Error: ${error}`);
    }
    setIsSaving(false);
  };

  return (
    <div class="settings-section">
      <h2>💰 Points Display</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
        Choose how points are displayed throughout the app.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <label class="toggle-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={isSaving}
          />
          <span class="toggle-slider"></span>
        </label>
        <div>
          <span style={{ fontWeight: "500" }}>Points-Only Mode</span>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-light)", margin: "0.25rem 0 0 0" }}>
            {enabled
              ? "Dollar values are hidden. Kids see only points."
              : "Dollar values are shown alongside points."
            }
          </p>
        </div>
      </div>

      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
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
          transition: 0.3s;
          border-radius: 28px;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .toggle-switch input:checked + .toggle-slider {
          background-color: var(--color-primary, #10b981);
        }
        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }
        .toggle-switch input:disabled + .toggle-slider {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

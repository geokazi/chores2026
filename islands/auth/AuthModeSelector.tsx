// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * Authentication Mode Selector - Reusable Mode Selection Component
 *
 * Provides consistent mode switching UI for email, phone, and social authentication.
 * Eliminates 90% duplication of tab layout and interaction logic between
 * login.tsx and signup.tsx.
 */

import { useEffect, useState } from "preact/hooks";

export interface AuthModeSelectorProps {
  currentMode: "email" | "phone" | "social";
  variant: "login" | "signup";
  availableModes?: ("email" | "phone" | "social")[];
  className?: string;
  disabled?: boolean;
}

export default function AuthModeSelector({
  currentMode,
  variant,
  availableModes = ["email", "phone", "social"],
  className = "",
  disabled = false,
}: AuthModeSelectorProps) {
  const [activeMode, setActiveMode] = useState(currentMode);

  useEffect(() => {
    setActiveMode(currentMode);
  }, [currentMode]);

  const handleModeChange = (mode: "email" | "phone" | "social") => {
    if (disabled || mode === activeMode) return;

    setActiveMode(mode);

    // Direct navigation to the new mode
    const currentPath = globalThis.location.pathname;
    const currentParams = new URLSearchParams(globalThis.location.search);
    currentParams.set("mode", mode);

    // Preserve other query parameters like plan, email, phone, etc.
    const newUrl = `${currentPath}?${currentParams.toString()}`;
    globalThis.location.href = newUrl;
  };

  const getModeConfig = (mode: "email" | "phone" | "social") => {
    const configs = {
      email: {
        icon: "📧",
        label: "Email",
        description: variant === "login"
          ? "Sign in with email"
          : "Sign up with email",
      },
      phone: {
        icon: "📱",
        label: "Phone",
        description: variant === "login"
          ? "Sign in with phone"
          : "Sign up with phone",
      },
      social: {
        icon: "🔗",
        label: "Social",
        description: variant === "login"
          ? "Sign in with Google/Facebook"
          : "Sign up with Google/Facebook",
      },
    };
    return configs[mode];
  };

  const baseTabStyle = {
    flex: 1,
    textAlign: "center" as const,
    padding: "0.75rem",
    borderRadius: "0.5rem",
    textDecoration: "none" as const,
    fontSize: "0.875rem",
    fontWeight: "500" as const,
    transition: "all 0.2s",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    border: "none",
    background: "transparent",
  };

  return (
    <div
      className={`auth-mode-selector ${className}`}
      style={{
        display: "flex",
        marginBottom: "2rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "0.25rem",
        backgroundColor: "#f9fafb",
      }}
    >
      {availableModes.map((mode) => {
        const config = getModeConfig(mode);
        const isActive = activeMode === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeChange(mode)}
            disabled={disabled}
            title={config.description}
            style={{
              ...baseTabStyle,
              backgroundColor: isActive ? "#3b82f6" : "transparent",
              color: isActive ? "white" : "#4b5563",
              ...(isActive && {
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              }),
            }}
            onMouseOver={(e) => {
              if (!disabled && !isActive) {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
            onMouseOut={(e) => {
              if (!disabled && !isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span style={{ marginRight: "0.5rem", fontSize: "1rem" }}>
              {config.icon}
            </span>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

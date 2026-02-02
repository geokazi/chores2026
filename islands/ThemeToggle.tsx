/**
 * ThemeToggle - Subtle light/dark mode toggle with demand signal tracking
 * Tracks clicks to learn user preferences and usage patterns (time of day)
 */

import { useEffect, useState } from "preact/hooks";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check system preference on mount
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Check if user has manually set preference
    const stored = localStorage.getItem("theme_preference");
    if (stored) {
      setIsDark(stored === "dark");
      applyTheme(stored === "dark");
    } else {
      setIsDark(prefersDark);
    }
    setMounted(true);
  }, []);

  const applyTheme = (dark: boolean) => {
    document.documentElement.setAttribute("data-theme-mode", dark ? "dark" : "light");
  };

  const trackToggle = async (newMode: "light" | "dark") => {
    try {
      let sessionId = sessionStorage.getItem("demand_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("demand_session_id", sessionId);
      }

      const now = new Date();
      await fetch("/api/demand-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          v: 2,
          feature: "theme_toggle",
          session_id: sessionId,
          assessment: {
            switched_to: newMode,
            hour_utc: now.getUTCHours(),
            hour_local: now.getHours(),
            day_of_week: now.getDay(),
          },
        }),
      });
    } catch (e) {
      // Non-blocking
    }
  };

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    applyTheme(newDark);
    localStorage.setItem("theme_preference", newDark ? "dark" : "light");
    trackToggle(newDark ? "dark" : "light");
  };

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) return <div class="theme-toggle-placeholder" />;

  return (
    <>
      <button
        class="theme-toggle"
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        {isDark ? "☀️" : "🌙"}
      </button>
      <style>{`
        .theme-toggle {
          background: none;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 6px;
          transition: background 0.2s;
          line-height: 1;
        }
        .theme-toggle:hover {
          background: rgba(128, 128, 128, 0.15);
        }
        .theme-toggle-placeholder {
          width: 30px;
          height: 30px;
        }

        /* Apply manual theme override */
        :root[data-theme-mode="light"] {
          color-scheme: light;
        }
        :root[data-theme-mode="dark"] {
          color-scheme: dark;
        }

        /* Override prefers-color-scheme when manually set */
        :root[data-theme-mode="light"] .landing-page {
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%) !important;
        }
        :root[data-theme-mode="light"] .landing-logo { color: #10b981 !important; }
        :root[data-theme-mode="light"] .nav-link { color: #064e3b !important; }
        :root[data-theme-mode="light"] .nav-link-primary { background: #10b981 !important; color: white !important; }
        :root[data-theme-mode="light"] .hero-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .hero-subtitle { color: #4b5563 !important; }
        :root[data-theme-mode="light"] .hero-pwa { background: white !important; color: #059669 !important; }
        :root[data-theme-mode="light"] .section-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .demo-section { background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%) !important; }
        :root[data-theme-mode="light"] .demo-container { background: white !important; }
        :root[data-theme-mode="light"] .demo-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .demo-subtitle { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .step { background: white !important; }
        :root[data-theme-mode="light"] .step-text { color: #064e3b !important; }
        :root[data-theme-mode="light"] .landing-footer { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .landing-footer a { color: #6b7280 !important; }

        :root[data-theme-mode="dark"] .landing-page {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%) !important;
        }
        :root[data-theme-mode="dark"] .landing-logo { color: #60a5fa !important; }
        :root[data-theme-mode="dark"] .nav-link { color: #e0e7ff !important; }
        :root[data-theme-mode="dark"] .nav-link-primary { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .hero-title { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .hero-subtitle { color: #cbd5e1 !important; }
        :root[data-theme-mode="dark"] .hero-pwa { background: #1e3a5f !important; color: #93c5fd !important; }
        :root[data-theme-mode="dark"] .section-title { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .demo-section { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important; }
        :root[data-theme-mode="dark"] .demo-container { background: #1e3a5f !important; }
        :root[data-theme-mode="dark"] .demo-badge { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .demo-title { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .demo-subtitle { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .step { background: #1e3a5f !important; }
        :root[data-theme-mode="dark"] .step-number { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .step-text { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .cta-section { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important; }
        :root[data-theme-mode="dark"] .landing-footer { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .landing-footer a { color: #94a3b8 !important; }
      `}</style>
    </>
  );
}

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
        :root[data-theme-mode="light"] { color-scheme: light; }
        :root[data-theme-mode="dark"] { color-scheme: dark; }

        /* ========== LIGHT MODE OVERRIDES ========== */
        :root[data-theme-mode="light"] .landing-page {
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%) !important;
        }
        :root[data-theme-mode="light"] .landing-logo { color: #10b981 !important; }
        :root[data-theme-mode="light"] .nav-link { color: #064e3b !important; }
        :root[data-theme-mode="light"] .nav-link-primary { background: #10b981 !important; color: white !important; }
        :root[data-theme-mode="light"] .hero-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .hero-subtitle { color: #4b5563 !important; }
        :root[data-theme-mode="light"] .hero-pwa { background: white !important; color: #059669 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important; }
        :root[data-theme-mode="light"] .section-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .demo-section { background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%) !important; }
        :root[data-theme-mode="light"] .demo-container { background: white !important; box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important; }
        :root[data-theme-mode="light"] .demo-badge { background: #10b981 !important; }
        :root[data-theme-mode="light"] .demo-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .demo-subtitle { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .step { background: white !important; box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important; }
        :root[data-theme-mode="light"] .step-number { background: #10b981 !important; }
        :root[data-theme-mode="light"] .step-text { color: #064e3b !important; }
        :root[data-theme-mode="light"] .cta-section { background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; }
        :root[data-theme-mode="light"] .btn-primary { background: white !important; color: #10b981 !important; }
        :root[data-theme-mode="light"] .btn-secondary { background: transparent !important; color: white !important; border: 2px solid rgba(255,255,255,0.5) !important; }
        :root[data-theme-mode="light"] .landing-footer { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .landing-footer a { color: #6b7280 !important; }

        /* Light mode: TeaserCards */
        :root[data-theme-mode="light"] .teaser-card { background: white !important; }
        :root[data-theme-mode="light"] .teaser-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        :root[data-theme-mode="light"] .teaser-card-live { border-color: #10b981 !important; }
        :root[data-theme-mode="light"] .teaser-card-soon { border-color: #e5e7eb !important; }
        :root[data-theme-mode="light"] .card-title { color: #064e3b !important; }
        :root[data-theme-mode="light"] .card-desc { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .card-cta-primary { background: #10b981 !important; color: white !important; }
        :root[data-theme-mode="light"] .card-cta-secondary { background: #f3f4f6 !important; color: #4b5563 !important; }

        /* Light mode: LandingDemo */
        :root[data-theme-mode="light"] .demo-kid { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%) !important; }
        :root[data-theme-mode="light"] .kid-name { color: #064e3b !important; }
        :root[data-theme-mode="light"] .kid-progress { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .points-value { color: #10b981 !important; }
        :root[data-theme-mode="light"] .points-label { color: #6b7280 !important; }
        :root[data-theme-mode="light"] .demo-chore { background: #f9fafb !important; }
        :root[data-theme-mode="light"] .demo-chore.completed { background: #f0fdf4 !important; }
        :root[data-theme-mode="light"] .demo-chore:not(.completed):hover { background: #f3f4f6 !important; }
        :root[data-theme-mode="light"] .chore-checkbox { background: white !important; border-color: #d1d5db !important; color: #9ca3af !important; }
        :root[data-theme-mode="light"] .demo-chore.completed .chore-checkbox { background: #10b981 !important; border-color: #10b981 !important; color: white !important; }
        :root[data-theme-mode="light"] .chore-name { color: #064e3b !important; }
        :root[data-theme-mode="light"] .demo-chore.completed .chore-name { color: #9ca3af !important; }
        :root[data-theme-mode="light"] .chore-points { color: #10b981 !important; }
        :root[data-theme-mode="light"] .demo-chore.completed .chore-points { color: #9ca3af !important; }
        :root[data-theme-mode="light"] .demo-hint { background: #fffbeb !important; color: #6b7280 !important; }
        :root[data-theme-mode="light"] .demo-cta { background: #10b981 !important; color: white !important; }

        /* ========== DARK MODE OVERRIDES ========== */
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
        :root[data-theme-mode="dark"] .demo-container { background: #1e3a5f !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; }
        :root[data-theme-mode="dark"] .demo-badge { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .demo-title { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .demo-subtitle { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .step { background: #1e3a5f !important; }
        :root[data-theme-mode="dark"] .step-number { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .step-text { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .cta-section { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important; }
        :root[data-theme-mode="dark"] .btn-primary { background: white !important; color: #1e40af !important; }
        :root[data-theme-mode="dark"] .btn-secondary { background: transparent !important; color: white !important; border: 2px solid rgba(255,255,255,0.5) !important; }
        :root[data-theme-mode="dark"] .landing-footer { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .landing-footer a { color: #94a3b8 !important; }

        /* Dark mode: TeaserCards */
        :root[data-theme-mode="dark"] .teaser-card { background: #1e293b !important; }
        :root[data-theme-mode="dark"] .teaser-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
        :root[data-theme-mode="dark"] .teaser-card-live { border-color: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .teaser-card-soon { border-color: #334155 !important; }
        :root[data-theme-mode="dark"] .card-title { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .card-desc { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .card-cta-primary { background: #3b82f6 !important; }
        :root[data-theme-mode="dark"] .card-cta-secondary { background: #334155 !important; color: #cbd5e1 !important; }

        /* Dark mode: LandingDemo */
        :root[data-theme-mode="dark"] .demo-kid { background: linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.1) 100%) !important; }
        :root[data-theme-mode="dark"] .kid-name { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .kid-progress { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .points-value { color: #60a5fa !important; }
        :root[data-theme-mode="dark"] .points-label { color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .demo-chore { background: #1e293b !important; }
        :root[data-theme-mode="dark"] .demo-chore.completed { background: #1e3a5f !important; }
        :root[data-theme-mode="dark"] .demo-chore:not(.completed):hover { background: #334155 !important; }
        :root[data-theme-mode="dark"] .chore-checkbox { background: #0f172a !important; border-color: #475569 !important; color: #64748b !important; }
        :root[data-theme-mode="dark"] .demo-chore.completed .chore-checkbox { background: #3b82f6 !important; border-color: #3b82f6 !important; color: white !important; }
        :root[data-theme-mode="dark"] .chore-name { color: #f1f5f9 !important; }
        :root[data-theme-mode="dark"] .demo-chore.completed .chore-name { color: #64748b !important; }
        :root[data-theme-mode="dark"] .chore-points { color: white !important; text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important; }
        :root[data-theme-mode="dark"] .demo-chore.completed .chore-points { color: rgba(255,255,255,0.6) !important; text-shadow: none !important; }
        :root[data-theme-mode="dark"] .demo-hint { background: #1e3a5f !important; color: #94a3b8 !important; }
        :root[data-theme-mode="dark"] .demo-cta { background: #3b82f6 !important; }
      `}</style>
    </>
  );
}

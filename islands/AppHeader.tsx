/**
 * AppHeader - Mobile-friendly navigation header
 * Features hamburger menu, page title, and user dropdown
 * ~150 lines, CSS-only animations, no external libraries
 */

import { useState, useEffect } from "preact/hooks";
import { changeTheme, type ThemeId } from "../lib/theme-manager.ts";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  avatar_emoji?: string;
  user_id?: string;  // Only set if member has their own login (parents, teens)
}

interface Props {
  currentPage: string;
  pageTitle: string;
  familyMembers: FamilyMember[];
  currentUser: FamilyMember | null;
  userRole: "parent" | "child";
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

const THEMES = [
  { key: "meadow", name: "Fresh Meadow", emoji: "🌿" },
  { key: "citrus", name: "Sunset Citrus", emoji: "🍊" },
  { key: "ocean", name: "Ocean Depth", emoji: "🌊" },
];

export default function AppHeader({
  currentPage,
  pageTitle,
  familyMembers,
  currentUser,
  userRole,
  currentTheme = "meadow",
  onThemeChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasUpcomingEvents, setHasUpcomingEvents] = useState(false);

  // Check for upcoming events (today/tomorrow) — lightweight non-blocking check
  useEffect(() => {
    if (userRole !== "parent") return;
    fetch("/api/events/badge-check")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.hasUpcoming) setHasUpcomingEvents(true);
      })
      .catch(() => {}); // Non-blocking, badge just won't show
  }, []);

  // Auto-detect and sync user timezone (once per session)
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stored = sessionStorage.getItem("tz_synced");
    if (stored === tz) return; // Already synced this session
    fetch("/api/settings/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    })
      .then(() => sessionStorage.setItem("tz_synced", tz))
      .catch(() => {});
  }, []);

  const isParent = userRole === "parent";
  const kids = familyMembers.filter((m) => m.role === "child");

  const handleThemeChange = (theme: string) => {
    // Use centralized theme manager (same as /parent/settings)
    changeTheme(theme as ThemeId);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  const handleSwitchUser = () => {
    // Clear kid session and go to family selector
    sessionStorage.removeItem("active_kid_id");
    sessionStorage.removeItem("active_kid_name");
    window.location.href = "/";
  };

  const handleLogout = () => {
    // Navigate to /logout which handles cookie clearing and redirects
    window.location.href = "/logout";
  };

  return (
    <header class="app-header">
      {/* Hamburger Menu Button */}
      <button
        class="header-btn menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        style={{ position: "relative" }}
      >
        {menuOpen ? "✕" : "☰"}
        {hasUpcomingEvents && !menuOpen && (
          <span class="header-badge-dot" />
        )}
      </button>

      {/* Page Title */}
      <h1 class="header-title">{pageTitle}</h1>

      {/* User Avatar Button */}
      <button
        class="header-btn user-btn"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        aria-label="User menu"
      >
        {currentUser?.avatar_emoji || (isParent ? "👤" : "🧒")}
      </button>

      {/* Navigation Menu (Left) */}
      {menuOpen && (
        <div class="menu-overlay" onClick={() => setMenuOpen(false)}>
          <nav class="nav-menu" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div class="nav-menu-header">
              <svg class="nav-logo" viewBox="0 0 1024 1024" fill="currentColor">
                <path d="M253 195c7 2 14 5 21 7l6 2c9 4 19 7 28 11 5 2 10 4 15 5 10 4 20 7 31 11 19 7 38 14 58 21l10 4c10 3 19 7 29 10l7 2c2 1 4 2 6 2 9 3 14 7 20 13l2 2c2 2 3 3 5 5l4 4 2 2c3 3 7 7 10 10l2 2c4 4 8 9 13 13 1 2 1 2 1 4l2 1c2 1 4 2 6 4l2 2 2 2 2 2c3 3 6 6 9 10 3 3 5 5 8 8 6 5 11 11 16 17 3 3 6 7 9 10 2 2 4 4 6 7 2 3 5 5 7 8l2 2c2 1 2 1 4 2 2-1 4-1 6-2 4-2 8-4 12-6 2-1 4-2 5-3 3-2 6-4 9-5 4-3 8-5 12-8 17-10 33-21 50-31 8-5 17-11 25-16 5-3 11-7 16-10l3-2c2-2 5-3 7-5l3-2c1-1 2-2 4-2 4-3 7-4 12-3 3 2 5 4 7 6l2 2c2 1 3 3 5 5 0 1 0 1 0 2h2v2l2 1c3 2 6 5 9 7 3 4 7 7 11 11 5 4 9 9 14 14 4 4 8 7 12 11 4 3 7 7 10 10 2 2 5 4 7 7 5 4 9 9 14 13l2 2 3 2 2 2c2 3 2 4 2 7-1 1-1 1-2 2h-3l-3-1h-4l-3-1h-4c-3 0-6 0-9 0-4 0-7 0-10 0-24 0-47-1-71-1v4c-1 11-1 23-2 35l-1 18-1 17v6c0 3 0 6 0 9v2c-1 18-1 18-7 24-5 4-9 8-14 12l-5 4-4 4c-9 7-17 14-26 21-5 4-10 9-15 13l-4 3c-7 5-13 11-20 16-5 4-9 7-13 11-3 3-6 5-10 8-3 2-6 5-9 8-5 4-9 8-14 11-6 5-12 10-18 15-4 3-7 6-11 9-4 4-9 7-13 11-19 16-19 16-27 23-6 5-13 10-19 15-5 4-10 9-15 13-5 4-9 8-14 12-4 3-4 3-6 3l-1 3c-4 14-4 14-7 20-2 1-2 1-5 2l-3 2-3 1-4 2c-10 5-21 9-31 13-7 3-15 6-22 10-18 8-36 15-54 23-3 1-6 2-9 4l-5 2-2 1c-3 1-6 2-10 2-1-1-1-1-2-2v-2c1-6 2-10 5-15l1-2c1-2 2-3 3-5 2-3 3-6 5-9l2-4c3-7 7-14 10-21l1-2c1-3 3-6 4-10 3-7 6-13 10-20l1-3c6-14 13-28 19-42 5-9 9-19 13-28 4-9 8-17 12-26 8-16 15-32 23-48l2-4c2-4 4-9 6-13l2-4 2-4 1-3c1-2 2-3 3-5 1-2 1-2 0-5-1-2-3-4-4-5l-2-2-2-2c-5-5-9-11-13-16-4-5-8-11-13-16l-2-2-2-3c-2-2-2-2-2-4h-1v-2l-2-1c-3-4-6-7-9-11-4-4-7-9-11-13-4-5-8-10-12-15-4-5-8-10-12-14-5-6-10-12-15-18-5-6-10-12-15-17-1-2-3-3-4-5-1-1-1-1-2-3l-2-2c-1-2-1-2-1-4h-1v-2l-2-1c-4-5-8-10-13-15-5-5-9-11-14-17-3-3-6-7-10-10-1-1-2-2-3-3-3-3-6-7-9-10l-1-1-1-2-2-2-1-1v-3l1-2c1-2 1-2 2-3 8 0 15 2 23 5l4 1c4 1 7 2 11 3 4 1 8 2 11 4l3 1c15 5 30 9 46 12l-1-2c-5-9-11-18-17-27-4-7-8-15-13-22-5-9-11-18-16-27l-2-3c-7-12-7-12-7-15 2-5 10-2 14 0z"/>
              </svg>
              <span class="nav-brand">ChoreGami</span>
              <button class="nav-close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {/* Menu body */}
            <div class="nav-menu-body">
              {/* Main navigation */}
              <div class="nav-section">
                <a href={isParent ? "/parent/dashboard" : "/kid/dashboard"} class={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}>
                  <svg class="nav-icon nav-icon-svg" viewBox="0 0 1024 1024" fill="currentColor">
                    <path d="M253 195c7 2 14 5 21 7l6 2c9 4 19 7 28 11 5 2 10 4 15 5 10 4 20 7 31 11 19 7 38 14 58 21l10 4c10 3 19 7 29 10l7 2c2 1 4 2 6 2 9 3 14 7 20 13l2 2c2 2 3 3 5 5l4 4 2 2c3 3 7 7 10 10l2 2c4 4 8 9 13 13 1 2 1 2 1 4l2 1c2 1 4 2 6 4l2 2 2 2 2 2c3 3 6 6 9 10 3 3 5 5 8 8 6 5 11 11 16 17 3 3 6 7 9 10 2 2 4 4 6 7 2 3 5 5 7 8l2 2c2 1 2 1 4 2 2-1 4-1 6-2 4-2 8-4 12-6 2-1 4-2 5-3 3-2 6-4 9-5 4-3 8-5 12-8 17-10 33-21 50-31 8-5 17-11 25-16 5-3 11-7 16-10l3-2c2-2 5-3 7-5l3-2c1-1 2-2 4-2 4-3 7-4 12-3 3 2 5 4 7 6l2 2c2 1 3 3 5 5 0 1 0 1 0 2h2v2l2 1c3 2 6 5 9 7 3 4 7 7 11 11 5 4 9 9 14 14 4 4 8 7 12 11 4 3 7 7 10 10 2 2 5 4 7 7 5 4 9 9 14 13l2 2 3 2 2 2c2 3 2 4 2 7-1 1-1 1-2 2h-3l-3-1h-4l-3-1h-4c-3 0-6 0-9 0-4 0-7 0-10 0-24 0-47-1-71-1v4c-1 11-1 23-2 35l-1 18-1 17v6c0 3 0 6 0 9v2c-1 18-1 18-7 24-5 4-9 8-14 12l-5 4-4 4c-9 7-17 14-26 21-5 4-10 9-15 13l-4 3c-7 5-13 11-20 16-5 4-9 7-13 11-3 3-6 5-10 8-3 2-6 5-9 8-5 4-9 8-14 11-6 5-12 10-18 15-4 3-7 6-11 9-4 4-9 7-13 11-19 16-19 16-27 23-6 5-13 10-19 15-5 4-10 9-15 13-5 4-9 8-14 12-4 3-4 3-6 3l-1 3c-4 14-4 14-7 20-2 1-2 1-5 2l-3 2-3 1-4 2c-10 5-21 9-31 13-7 3-15 6-22 10-18 8-36 15-54 23-3 1-6 2-9 4l-5 2-2 1c-3 1-6 2-10 2-1-1-1-1-2-2v-2c1-6 2-10 5-15l1-2c1-2 2-3 3-5 2-3 3-6 5-9l2-4c3-7 7-14 10-21l1-2c1-3 3-6 4-10 3-7 6-13 10-20l1-3c6-14 13-28 19-42 5-9 9-19 13-28 4-9 8-17 12-26 8-16 15-32 23-48l2-4c2-4 4-9 6-13l2-4 2-4 1-3c1-2 2-3 3-5 1-2 1-2 0-5-1-2-3-4-4-5l-2-2-2-2c-5-5-9-11-13-16-4-5-8-11-13-16l-2-2-2-3c-2-2-2-2-2-4h-1v-2l-2-1c-3-4-6-7-9-11-4-4-7-9-11-13-4-5-8-10-12-15-4-5-8-10-12-14-5-6-10-12-15-18-5-6-10-12-15-17-1-2-3-3-4-5-1-1-1-1-2-3l-2-2c-1-2-1-2-1-4h-1v-2l-2-1c-4-5-8-10-13-15-5-5-9-11-14-17-3-3-6-7-10-10-1-1-2-2-3-3-3-3-6-7-9-10l-1-1-1-2-2-2-1-1v-3l1-2c1-2 1-2 2-3 8 0 15 2 23 5l4 1c4 1 7 2 11 3 4 1 8 2 11 4l3 1c15 5 30 9 46 12l-1-2c-5-9-11-18-17-27-4-7-8-15-13-22-5-9-11-18-16-27l-2-3c-7-12-7-12-7-15 2-5 10-2 14 0z"/>
                  </svg>
                  <span>Dashboard</span>
                </a>
                <a href="/reports" class={`nav-item ${currentPage === "reports" ? "active" : ""}`}>
                  <span class="nav-icon">📊</span>
                  <span>Reports</span>
                </a>

                {/* Kid-only financial features */}
                {!isParent && (
                  <>
                    <a href="/kid/rewards" class={`nav-item ${currentPage === "rewards" ? "active" : ""}`}>
                      <span class="nav-icon">🎁</span>
                      <span>Rewards</span>
                    </a>
                    <a href="/kid/goals" class={`nav-item ${currentPage === "goals" ? "active" : ""}`}>
                      <span class="nav-icon">🎯</span>
                      <span>My Goals</span>
                    </a>
                  </>
                )}

                {isParent && (
                  <>
                    <a
                      href="/parent/events"
                      class={`nav-item ${currentPage === "events" ? "active" : ""}`}
                      onClick={() => {
                        if (hasUpcomingEvents) {
                          fetch("/api/analytics/event", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ metric: "badges" }),
                          }).catch(() => {});
                        }
                      }}
                    >
                      <span class="nav-icon">📅</span>
                      <span>Events</span>
                      {hasUpcomingEvents && <span class="nav-badge" />}
                    </a>
                    <a href="/parent/balances" class={`nav-item ${currentPage === "balances" ? "active" : ""}`}>
                      <span class="nav-icon">💰</span>
                      <span>Balances</span>
                    </a>
                    <a href="/parent/rewards" class={`nav-item ${currentPage === "rewards" ? "active" : ""}`}>
                      <span class="nav-icon">🎁</span>
                      <span>Rewards</span>
                    </a>
                    <a href="/parent/insights" class={`nav-item ${currentPage === "insights" ? "active" : ""}`}>
                      <span class="nav-icon">🧠</span>
                      <span>Habit Insights</span>
                    </a>
                  </>
                )}
              </div>

              {/* Settings */}
              <div class="nav-section">
                <a href="/parent/settings" class={`nav-item ${currentPage === "settings" ? "active" : ""}`}>
                  <span class="nav-icon">⚙️</span>
                  <span>Settings</span>
                </a>
              </div>

              {/* Theme picker (compact, no label) */}
              <div class="nav-section nav-section-footer">
                <div class="nav-theme-picker">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.key}
                      class={`nav-theme-btn ${currentTheme === theme.key ? "active" : ""}`}
                      onClick={() => handleThemeChange(theme.key)}
                      title={theme.name}
                    >
                      {theme.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* User Menu (Right) */}
      {userMenuOpen && (
        <div class="menu-overlay" onClick={() => setUserMenuOpen(false)}>
          <nav class="user-menu" onClick={(e) => e.stopPropagation()}>
            {/* Header with theme color */}
            <div class="user-menu-header">
              <span class="user-avatar-large">{currentUser?.avatar_emoji || "👤"}</span>
              <span class="user-name-large">{currentUser?.name || "User"}</span>
            </div>

            {/* Menu body */}
            <div class="user-menu-body">
              {/* User Switcher */}
              {familyMembers.filter((m) => m.id !== currentUser?.id).length > 0 && (
                <div class="user-menu-section">
                  <span class="user-menu-label">Switch to</span>
                  {familyMembers
                    .filter((m) => m.id !== currentUser?.id)
                    .map((member) => (
                      <button
                        key={member.id}
                        class="user-menu-item"
                        onClick={() => {
                          ActiveKidSessionManager.setActiveKid(member.id, member.name);
                          window.location.href = member.role === "parent"
                            ? "/parent/my-chores"
                            : "/kid/dashboard";
                        }}
                      >
                        <span class="item-emoji">{member.avatar_emoji || (member.role === "parent" ? "👤" : "🧒")}</span>
                        <span>{member.name}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Actions */}
              <div class="user-menu-section">
                <a href="/parent/dashboard" class="user-menu-item">
                  <span class="item-emoji">👨‍👩‍👧‍👦</span>
                  <span>Family Dashboard</span>
                </a>
                {currentUser?.user_id && (
                  <a href="/share" class="user-menu-item">
                    <span class="item-emoji">🎁</span>
                    <span>Share ChoreGami</span>
                  </a>
                )}
                <button class="user-menu-item logout-item" onClick={handleLogout}>
                  <span class="item-emoji">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--color-primary);
          color: white;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s, transform 0.1s;
        }
        .header-btn:hover { background: rgba(255,255,255,0.2); }
        .header-btn:active { transform: scale(0.95); }
        .header-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 200;
          animation: fadeIn 0.15s ease;
          backdrop-filter: blur(2px);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Left nav menu - modern card design */
        .nav-menu {
          position: absolute;
          top: 8px;
          left: 8px;
          background: var(--color-card);
          width: 260px;
          max-width: 85vw;
          max-height: calc(100vh - 16px);
          padding: 0;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.2s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 16px;
          overflow: hidden;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }

        .nav-menu-header {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .nav-logo {
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          width: 40px;
          height: 40px;
          padding: 8px;
          color: white;
        }
        .nav-brand {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          flex: 1;
        }
        .nav-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .nav-close:hover { background: rgba(255,255,255,0.3); }

        .nav-menu-body {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
          flex: 1;
        }
        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-section + .nav-section {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--color-bg);
        }
        .nav-section-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.25rem 0.75rem 0.4rem;
        }
        .nav-section-bottom {
          margin-top: auto;
        }
        .nav-section-footer {
          margin-top: auto;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 0.75rem;
          color: var(--color-text);
          text-decoration: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s, transform 0.1s;
          position: relative;
        }
        .nav-item:hover {
          background: var(--color-bg);
        }
        .nav-item:active {
          transform: scale(0.98);
        }
        .nav-item.active {
          background: var(--color-primary);
          color: white;
        }
        .nav-icon {
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
        }
        .nav-icon-svg {
          width: 20px;
          height: 20px;
          color: var(--color-primary);
        }
        .nav-item.active .nav-icon-svg {
          color: white;
        }
        .nav-badge {
          position: absolute;
          right: 12px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: badgePulse 2s infinite;
        }
        .nav-logout {
          color: var(--color-warning, #dc2626);
        }

        /* Theme picker in nav */
        .nav-theme-picker {
          display: flex;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem 0.5rem;
        }
        .nav-theme-btn {
          width: 44px;
          height: 44px;
          border: 2px solid transparent;
          border-radius: 12px;
          font-size: 1.25rem;
          cursor: pointer;
          background: var(--color-bg);
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .nav-theme-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .nav-theme-btn:active { transform: scale(0.95); }
        .nav-theme-btn.active {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-bg), 0 2px 8px rgba(0,0,0,0.15);
          background: var(--color-card);
        }

        /* Right user menu - modern card design */
        .user-menu {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--color-card);
          width: 220px;
          max-width: 80vw;
          max-height: 85vh;
          padding: 0;
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.2s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 16px;
          overflow: hidden;
        }
        @keyframes slideInRight { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .user-menu-header {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%);
          padding: 1.25rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar-large {
          font-size: 2.25rem;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-name-large {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }

        .user-menu-body {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }
        .user-menu-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-menu-section + .user-menu-section {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--color-bg);
        }
        .user-menu-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.25rem 0.75rem 0.4rem;
        }
        .user-menu-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 0.75rem;
          color: var(--color-text);
          text-decoration: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s, transform 0.1s;
        }
        .user-menu-item:hover {
          background: var(--color-bg);
        }
        .user-menu-item:active {
          transform: scale(0.98);
        }
        .item-emoji {
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
        }
        .logout-item {
          color: var(--color-warning, #dc2626);
        }

        /* Menu items - compact & playful */
        .nav-menu a, .nav-menu button, .user-menu a, .user-menu button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          color: var(--color-text);
          text-decoration: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 500;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s, transform 0.1s;
        }
        .nav-menu a:hover, .nav-menu button:hover,
        .user-menu a:hover, .user-menu button:hover {
          background: var(--color-bg);
          transform: translateX(2px);
        }
        .nav-menu a:active, .nav-menu button:active,
        .user-menu a:active, .user-menu button:active {
          transform: scale(0.98);
        }
        .nav-menu a.active, .nav-menu button.active {
          background: var(--color-primary);
          color: white;
          font-weight: 600;
        }

        /* Section dividers */
        .menu-section {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--color-bg);
        }
        .menu-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.25rem 0.75rem 0.4rem;
        }
        .kid-link { font-size: 0.9rem; }

        /* Theme picker - inline & compact */
        .theme-picker {
          display: flex;
          gap: 0.4rem;
          padding: 0.25rem 0.5rem 0.5rem;
        }
        .theme-btn {
          width: 36px;
          height: 36px;
          border: 2px solid transparent;
          border-radius: 10px;
          font-size: 1.1rem;
          cursor: pointer;
          background: var(--color-bg);
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .theme-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .theme-btn:active { transform: scale(0.95); }
        .theme-btn.active {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-bg), 0 2px 8px rgba(0,0,0,0.1);
        }

        /* Badge dots */
        .header-badge-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 9px;
          height: 9px;
          background: #ef4444;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
          animation: badgePulse 2s infinite;
        }
        .event-badge-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </header>
  );
}

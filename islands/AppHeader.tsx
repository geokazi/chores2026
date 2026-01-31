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
            <a href={isParent ? "/parent/dashboard" : "/kid/dashboard"} class={currentPage === "dashboard" ? "active" : ""}>
              🏠 Dashboard
            </a>
            <a href="/reports" class={currentPage === "reports" ? "active" : ""}>
              📊 Reports
            </a>

            {/* Kid-only financial features */}
            {!isParent && (
              <>
                <a href="/kid/rewards" class={currentPage === "rewards" ? "active" : ""}>
                  🎁 Rewards
                </a>
                <a href="/kid/goals" class={currentPage === "goals" ? "active" : ""}>
                  🎯 My Goals
                </a>
              </>
            )}

            {isParent && (
              <>
                <a
                  href="/parent/events"
                  class={currentPage === "events" ? "active" : ""}
                  style={{ position: "relative" }}
                  onClick={() => {
                    if (hasUpcomingEvents) {
                      fetch("/api/analytics/event", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ metric: "badges" }),
                      }).catch(() => {}); // Non-blocking
                    }
                  }}
                >
                  📅 Events
                  {hasUpcomingEvents && (
                    <span class="event-badge-dot" />
                  )}
                </a>
                <a href="/parent/balances" class={currentPage === "balances" ? "active" : ""}>
                  💰 Balances
                </a>
                <a href="/parent/rewards" class={currentPage === "rewards" ? "active" : ""}>
                  🎁 Rewards
                </a>
                <a href="/parent/insights" class={currentPage === "insights" ? "active" : ""}>
                  🧠 Habit Insights
                </a>
              </>
            )}

            {/* Kid shortcuts - SECURITY: session-based, no GUIDs in URLs */}
            {kids.length > 0 && (
              <div class="menu-section">
                <span class="menu-label">Quick View</span>
                {kids.map((kid) => (
                  <button
                    key={kid.id}
                    class={`kid-link ${currentUser?.id === kid.id ? "active" : ""}`}
                    onClick={async () => {
                      const { ActiveKidSessionManager } = await import("../lib/active-kid-session.ts");
                      ActiveKidSessionManager.setActiveKid(kid.id, kid.name);
                      window.location.href = "/kid/dashboard";
                    }}
                  >
                    {kid.avatar_emoji || "🧒"} {kid.name}
                  </button>
                ))}
              </div>
            )}

            {/* Switch User - go back to family selector */}
            <button onClick={handleSwitchUser}>
              👥 Switch User
            </button>

            {/* Settings - Parent-only, PIN-protected */}
            <a
              href="/parent/settings"
              class={currentPage === "settings" ? "active" : ""}
              title="Adjust Points, Chore Templates, Weekly Goal, PIN & Security"
            >
              ⚙️ Settings
            </a>

            {/* Share ChoreGami - only for users with their own account (parents, teens) */}
            {currentUser?.user_id && (
              <a
                href="/share"
                title="Get 1 free month when friends join"
              >
                🎁 Share ChoreGami
              </a>
            )}

            {/* Inline Theme Picker */}
            <div class="menu-section">
              <span class="menu-label">Theme</span>
              <div class="theme-picker">
                {THEMES.map((theme) => (
                  <button
                    key={theme.key}
                    class={`theme-btn ${currentTheme === theme.key ? "active" : ""}`}
                    onClick={() => handleThemeChange(theme.key)}
                    title={theme.name}
                  >
                    {theme.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Logout at bottom */}
            <div class="menu-section">
              <button onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* User Menu (Right) */}
      {userMenuOpen && (
        <div class="menu-overlay" onClick={() => setUserMenuOpen(false)}>
          <nav class="user-menu" onClick={(e) => e.stopPropagation()}>
            <div class="user-info">
              <span class="user-avatar">{currentUser?.avatar_emoji || "👤"}</span>
              <span class="user-name">{currentUser?.name || "User"}</span>
            </div>
            <hr />

            {/* Inline User Switcher - All family members */}
            <div class="menu-section" style={{ marginTop: 0, paddingTop: "0.5rem", borderTop: "none" }}>
              <span class="menu-label">Switch to</span>
              {familyMembers
                .filter((m) => m.id !== currentUser?.id)
                .map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      ActiveKidSessionManager.setActiveKid(member.id, member.name);
                      window.location.href = member.role === "parent"
                        ? "/parent/my-chores"
                        : "/kid/dashboard";
                    }}
                  >
                    {member.avatar_emoji || (member.role === "parent" ? "👤" : "🧒")} {member.name}
                  </button>
                ))}
            </div>

            <hr />
            {/* Share ChoreGami - only for users with their own account (parents, teens) */}
            {currentUser?.user_id && (
              <a href="/share">
                🎁 Share ChoreGami
              </a>
            )}
            <button onClick={handleLogout}>
              🚪 Logout
            </button>
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

        /* Left nav menu */
        .nav-menu {
          position: absolute;
          top: 0;
          left: 0;
          background: var(--color-card);
          width: 260px;
          max-width: 85vw;
          height: 100vh;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: slideIn 0.2s ease;
          box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

        /* Right user menu */
        .user-menu {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--color-card);
          width: 240px;
          max-width: 80vw;
          max-height: 85vh;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: slideInRight 0.2s ease;
          box-shadow: -4px 4px 24px rgba(0,0,0,0.15);
          border-radius: 0 0 0 16px;
          overflow-y: auto;
        }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

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

        /* User info header */
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.5rem 0.75rem;
        }
        .user-avatar { font-size: 1.75rem; }
        .user-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--color-text);
        }
        .user-menu hr {
          border: none;
          border-top: 1px solid var(--color-bg);
          margin: 0.4rem 0;
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

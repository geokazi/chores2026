/**
 * AppHeader - Mobile-friendly navigation header
 * Features hamburger menu, page title, and user dropdown
 * ~150 lines, CSS-only animations, no external libraries
 */

import { useState } from "preact/hooks";
import { changeTheme, type ThemeId } from "../lib/theme-manager.ts";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  avatar_emoji?: string;
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header class="app-header">
      {/* Hamburger Menu Button */}
      <button
        class="header-btn menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        {menuOpen ? "✕" : "☰"}
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

            {/* Manage Family - Parent-only, PIN-protected */}
            <a
              href="/parent/settings"
              class={currentPage === "settings" ? "active" : ""}
              title="Adjust Points, Chore Templates, Weekly Goal, PIN & Security"
            >
              👨‍👩‍👧‍👦 Manage Family
            </a>

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
            <button onClick={handleSwitchUser}>
              🔄 Switch User
            </button>
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
          transition: background 0.2s;
        }
        .header-btn:hover { background: rgba(255,255,255,0.2); }
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
          background: rgba(0,0,0,0.5);
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .nav-menu, .user-menu {
          position: absolute;
          top: 0;
          background: var(--color-card);
          min-width: 240px;
          height: 100vh;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          animation: slideIn 0.2s ease;
          box-shadow: 4px 0 20px rgba(0,0,0,0.2);
        }
        .nav-menu { left: 0; }
        .user-menu { right: 0; height: auto; border-radius: 0 0 0 12px; }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .user-menu { animation-name: slideInRight; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .nav-menu a, .nav-menu button, .user-menu button {
          display: block;
          padding: 0.75rem 1rem;
          color: var(--color-text);
          text-decoration: none;
          border-radius: 8px;
          font-size: 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }
        .nav-menu a:hover, .nav-menu button:hover, .user-menu button:hover { background: var(--color-bg); }
        .nav-menu a.active, .nav-menu button.active { background: var(--color-primary); color: white; }
        .menu-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-bg); }
        .menu-label { font-size: 0.75rem; color: var(--color-text-light); text-transform: uppercase; padding: 0 1rem; }
        .kid-link { font-size: 0.9rem; }
        .theme-picker { display: flex; gap: 0.5rem; padding: 0.5rem 1rem; }
        .theme-btn {
          width: 40px;
          height: 40px;
          border: 2px solid var(--color-bg);
          border-radius: 8px;
          font-size: 1.25rem;
          cursor: pointer;
          background: var(--color-card);
          transition: transform 0.2s;
        }
        .theme-btn:hover { transform: scale(1.1); }
        .theme-btn.active { border-color: var(--color-primary); background: var(--color-bg); }
        .user-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; }
        .user-avatar { font-size: 2rem; }
        .user-name { font-weight: 600; color: var(--color-text); }
        .user-menu hr { border: none; border-top: 1px solid var(--color-bg); margin: 0.5rem 0; }
      `}</style>
    </header>
  );
}

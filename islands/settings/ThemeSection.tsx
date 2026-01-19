/**
 * ThemeSection - App theme selection
 */

import { useState, useEffect } from "preact/hooks";
import { getCurrentTheme, changeTheme, themes, type ThemeId } from "../../lib/theme-manager.ts";

export default function ThemeSection() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => {
    return getCurrentTheme();
  });

  // Apply theme on component mount
  useEffect(() => {
    changeTheme(selectedTheme);
  }, []);

  const handleThemeChange = (themeId: ThemeId) => {
    console.log('🎨 Changing theme to:', themeId);
    setSelectedTheme(themeId);
    changeTheme(themeId);
    console.log('✅ Theme applied and saved:', themeId);
  };

  return (
    <div class="settings-section">
      <h2>🎨 App Theme</h2>
      <div class="theme-selector">
        {themes.map((theme) => (
          <div
            key={theme.id}
            class={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
            onClick={() => handleThemeChange(theme.id)}
          >
            <div
              class="theme-color"
              style={{ backgroundColor: theme.color }}
            ></div>
            <span class="theme-name">{theme.name}</span>
            {selectedTheme === theme.id && <span class="theme-check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

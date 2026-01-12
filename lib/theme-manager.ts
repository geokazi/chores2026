/**
 * Theme Management Utility
 * Provides centralized theme management with localStorage persistence
 */

export type ThemeId = 'meadow' | 'citrus' | 'ocean';

export interface Theme {
  id: ThemeId;
  name: string;
  color: string;
}

export const themes: Theme[] = [
  { id: "meadow", name: "Fresh Meadow", color: "#10b981" },
  { id: "citrus", name: "Sunset Citrus", color: "#f59e0b" },
  { id: "ocean", name: "Ocean Depth", color: "#3b82f6" }
];

export const DEFAULT_THEME: ThemeId = 'meadow';

/**
 * Get the currently active theme from localStorage or default
 */
export function getCurrentTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  const saved = localStorage.getItem('app_theme') as ThemeId;
  if (saved && themes.some(theme => theme.id === saved)) {
    return saved;
  }
  
  return DEFAULT_THEME;
}

/**
 * Apply a theme to the document
 */
export function applyTheme(themeId: ThemeId): void {
  if (typeof window === 'undefined') return;
  
  // Validate theme ID
  if (!themes.some(theme => theme.id === themeId)) {
    console.warn('Invalid theme ID:', themeId, '- using default');
    themeId = DEFAULT_THEME;
  }
  
  // Apply to document
  document.documentElement.setAttribute('data-theme', themeId);
  
  // Save to localStorage
  localStorage.setItem('app_theme', themeId);
  
  console.log('🎨 Theme applied:', themeId);
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme);
}

/**
 * Change theme and persist
 */
export function changeTheme(themeId: ThemeId): void {
  applyTheme(themeId);
}

/**
 * Get theme data by ID
 */
export function getThemeById(themeId: ThemeId): Theme | undefined {
  return themes.find(theme => theme.id === themeId);
}
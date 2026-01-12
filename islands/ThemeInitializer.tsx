/**
 * Theme Initializer Island
 * Ensures the saved theme is applied on every page load
 */

import { useEffect } from "preact/hooks";
import { initializeTheme } from "../lib/theme-manager.ts";

export default function ThemeInitializer() {
  useEffect(() => {
    // Initialize theme as soon as possible
    initializeTheme();
  }, []);

  // This component renders nothing visible
  return null;
}
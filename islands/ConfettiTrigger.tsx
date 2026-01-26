/**
 * ConfettiTrigger - Global confetti animation island
 *
 * Loads the confetti script and listens for celebration events.
 * Include this once in _app.tsx to enable confetti across all pages.
 *
 * To trigger confetti from any component:
 *   window.dispatchEvent(new CustomEvent('choregami:celebrate', {
 *     detail: { type: 'chore_complete' | 'bonus_points' | 'milestone' }
 *   }));
 *
 * Or use the helper:
 *   window.choreGamiConfetti?.trigger('chore_complete');
 */

import { useEffect } from "preact/hooks";

export default function ConfettiTrigger() {
  useEffect(() => {
    // Load the confetti script on mount
    const script = document.createElement('script');
    script.src = '/scripts/confetti.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount (though this rarely happens for _app components)
      document.head.removeChild(script);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

/**
 * Helper function to trigger confetti from any component
 * Import this in components that need to trigger celebrations
 */
export function triggerCelebration(type: 'chore_complete' | 'bonus_points' | 'milestone' = 'chore_complete') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('choregami:celebrate', {
      detail: { type }
    }));
  }
}

/**
 * Check if confetti is enabled (reads from localStorage)
 */
export function isConfettiEnabled(): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('choregami_confetti_disabled') !== 'true';
  }
  return true; // Default to enabled
}

/**
 * Set confetti enabled/disabled
 */
export function setConfettiEnabled(enabled: boolean) {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    if (enabled) {
      localStorage.removeItem('choregami_confetti_disabled');
    } else {
      localStorage.setItem('choregami_confetti_disabled', 'true');
    }
  }
}

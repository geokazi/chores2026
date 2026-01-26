/**
 * ChoreGami Confetti Animation System
 * Adapted from FamilyScore implementation
 *
 * Trigger types:
 * - chore_complete: Green confetti for completing chores
 * - bonus_points: Gold confetti for bonus points awarded
 * - milestone: Special multi-color confetti for family milestones
 */

// Confetti configurations per celebration type
const confettiConfigs = {
  chore_complete: {
    primary: {
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
      colors: ['#10b981', '#22c55e', '#059669'], // Fresh Meadow greens
    },
    secondary: {
      particleCount: 30,
      spread: 70,
      origin: { y: 0.6, x: 0.3 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    },
    finale: {
      particleCount: 30,
      spread: 70,
      origin: { y: 0.6, x: 0.7 },
      colors: ['#059669', '#10b981', '#a7f3d0'],
    },
  },
  bonus_points: {
    primary: {
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#f97316'], // Amber/gold
    },
    secondary: {
      particleCount: 40,
      spread: 80,
      origin: { y: 0.5, x: 0.25 },
      colors: ['#fcd34d', '#fde68a', '#f59e0b'],
    },
    finale: {
      particleCount: 40,
      spread: 80,
      origin: { y: 0.5, x: 0.75 },
      colors: ['#f97316', '#fb923c', '#fbbf24'],
    },
  },
  milestone: {
    primary: {
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'], // Special celebration
    },
    secondary: {
      particleCount: 50,
      spread: 120,
      origin: { y: 0.4, x: 0.2 },
      colors: ['#60a5fa', '#a78bfa', '#f472b6'],
    },
    finale: {
      particleCount: 50,
      spread: 120,
      origin: { y: 0.4, x: 0.8 },
      colors: ['#2563eb', '#7c3aed', '#db2777'],
    },
  },
};

/**
 * Trigger confetti animation
 * @param {string} type - Animation type: 'chore_complete' | 'bonus_points' | 'milestone'
 * @param {number} duration - Animation duration in milliseconds (default: 2500)
 */
function triggerConfetti(type = 'chore_complete', duration = 2500) {
  // Check if confetti library is loaded
  if (typeof confetti === 'undefined') {
    console.warn('canvas-confetti library not loaded');
    return;
  }

  // Check if confetti is disabled (stored in localStorage)
  if (localStorage.getItem('choregami_confetti_disabled') === 'true') {
    console.log('Confetti disabled by user preference');
    return;
  }

  const config = confettiConfigs[type] || confettiConfigs.chore_complete;

  // Primary burst
  confetti(config.primary);

  // Secondary burst (delayed)
  setTimeout(() => confetti(config.secondary), 200);

  // Finale burst (delayed)
  setTimeout(() => confetti(config.finale), 400);

  console.log(`Confetti triggered: ${type}`);
}

/**
 * Set confetti enabled/disabled preference
 * @param {boolean} enabled - Whether confetti is enabled
 */
function setConfettiEnabled(enabled) {
  if (enabled) {
    localStorage.removeItem('choregami_confetti_disabled');
  } else {
    localStorage.setItem('choregami_confetti_disabled', 'true');
  }
}

/**
 * Check if confetti is enabled
 * @returns {boolean}
 */
function isConfettiEnabled() {
  return localStorage.getItem('choregami_confetti_disabled') !== 'true';
}

// Listen for custom celebrate events
window.addEventListener('choregami:celebrate', (event) => {
  const { type } = event.detail || {};
  triggerConfetti(type || 'chore_complete');
});

// Expose functions globally for easy access
window.choreGamiConfetti = {
  trigger: triggerConfetti,
  setEnabled: setConfettiEnabled,
  isEnabled: isConfettiEnabled,
};

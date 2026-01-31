/**
 * ChoreGami Confetti Animation System
 * Adapted from FamilyScore implementation
 *
 * Trigger types:
 * - chore_complete: Green confetti for completing chores
 * - bonus_points: Gold confetti for bonus points awarded
 * - milestone: Special multi-color confetti for family milestones
 *
 * iOS Audio Fix:
 * iOS Safari/Chrome require user gesture to unlock AudioContext.
 * We create a shared context and unlock it on first touch/click.
 */

// Shared AudioContext for iOS compatibility (unlocked on first interaction)
let sharedAudioContext = null;
let audioUnlocked = false;

/**
 * Get or create the shared AudioContext
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  if (sharedAudioContext) return sharedAudioContext;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

/**
 * Unlock AudioContext on iOS (must be called from user gesture)
 * Creates a silent buffer and plays it to unlock audio playback
 */
function unlockAudioContext() {
  if (audioUnlocked) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (iOS requirement)
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioUnlocked = true;
      console.log('AudioContext unlocked for iOS');
    }).catch(() => {});
  } else {
    audioUnlocked = true;
  }

  // Play silent buffer to fully unlock (some iOS versions need this)
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

// Unlock audio on first user interaction (iOS requirement)
['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
  document.addEventListener(event, unlockAudioContext, { once: true, passive: true });
});

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
 * Trigger haptic feedback (vibration) on supported devices
 * @param {string} type - Celebration type for pattern variation
 */
function triggerHaptics(type = 'chore_complete') {
  if (!navigator.vibrate) return;

  const patterns = {
    chore_complete: [100, 50, 100],      // Quick double buzz
    bonus_points: [50, 30, 50, 30, 150], // Exciting triple buzz
    milestone: [100, 50, 100, 50, 200],  // Celebratory pattern
  };

  navigator.vibrate(patterns[type] || patterns.chore_complete);
}

/**
 * Play celebration sound using Web Audio API (no external files)
 * Uses shared AudioContext for iOS compatibility
 * @param {string} type - Celebration type for tone variation
 */
function triggerCelebrationSound(type = 'chore_complete') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ensure context is running (may be suspended on iOS)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Different tones for different celebrations
    const tones = {
      chore_complete: [{ freq: 880, start: 0, dur: 0.15 }, { freq: 1108, start: 0.12, dur: 0.2 }], // A5 → C#6 (cheerful)
      bonus_points: [{ freq: 659, start: 0, dur: 0.1 }, { freq: 880, start: 0.1, dur: 0.1 }, { freq: 1108, start: 0.2, dur: 0.25 }], // E5 → A5 → C#6 (cha-ching)
      milestone: [{ freq: 523, start: 0, dur: 0.15 }, { freq: 659, start: 0.15, dur: 0.15 }, { freq: 784, start: 0.3, dur: 0.15 }, { freq: 1047, start: 0.45, dur: 0.3 }], // C5 → E5 → G5 → C6 (fanfare)
    };

    const sequence = tones[type] || tones.chore_complete;

    sequence.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      // Gentle envelope
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });

    // Note: Don't close shared context - it's reused for all sounds
  } catch (e) {
    // Silently fail - sound is optional enhancement
    console.debug('Sound playback failed:', e.message);
  }
}

/**
 * Trigger confetti animation
 * @param {string} type - Animation type: 'chore_complete' | 'bonus_points' | 'milestone'
 */
function triggerConfetti(type = 'chore_complete') {
  // Check if celebrations are disabled (stored in localStorage)
  if (!isConfettiEnabled()) {
    console.log('Celebrations disabled by user preference');
    return;
  }

  // Trigger haptics and sound immediately (even if confetti library not loaded)
  triggerHaptics(type);
  triggerCelebrationSound(type);

  // Check if confetti library is loaded
  if (typeof confetti === 'undefined') {
    console.warn('canvas-confetti library not loaded (haptics/sound still triggered)');
    return;
  }

  const config = confettiConfigs[type] || confettiConfigs.chore_complete;

  // Primary burst
  confetti(config.primary);

  // Secondary burst (delayed)
  setTimeout(() => confetti(config.secondary), 200);

  // Finale burst (delayed)
  setTimeout(() => confetti(config.finale), 400);

  console.log(`Celebration triggered: ${type}`);
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
  triggerHaptics: triggerHaptics,
  triggerSound: triggerCelebrationSound,
  // iOS audio debugging
  unlockAudio: unlockAudioContext,
  isAudioUnlocked: () => audioUnlocked,
  getAudioState: () => sharedAudioContext?.state || 'no context',
};

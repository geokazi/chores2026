/**
 * Admin Idle Timeout Island
 * Auto-logout after 2 minutes of inactivity for security
 * ~60 lines
 */

import { useEffect, useRef, useState } from "preact/hooks";

interface Props {
  timeoutMinutes?: number;
}

export default function AdminIdleTimeout({ timeoutMinutes = 2 }: Props) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const TIMEOUT_MS = timeoutMinutes * 60 * 1000;
  const WARNING_MS = 30 * 1000; // Show warning 30s before logout

  const logout = () => {
    window.location.href = "/logout";
  };

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);
    setSecondsLeft(30);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(30);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(logout, TIMEOUT_MS);
  };

  const handleActivity = () => {
    resetTimer();
  };

  useEffect(() => {
    // Track user activity
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div class="idle-warning-overlay">
      <div class="idle-warning-modal">
        <div class="warning-icon">⏱️</div>
        <h2>Session Expiring</h2>
        <p>You will be logged out in <strong>{secondsLeft}</strong> seconds due to inactivity.</p>
        <button onClick={handleActivity} class="stay-btn">
          Stay Logged In
        </button>
      </div>

      <style>{`
        .idle-warning-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .idle-warning-modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          max-width: 320px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .warning-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .idle-warning-modal h2 {
          margin: 0 0 0.5rem;
          color: #1e293b;
        }
        .idle-warning-modal p {
          margin: 0 0 1.5rem;
          color: #64748b;
        }
        .idle-warning-modal strong {
          color: #ef4444;
          font-size: 1.25rem;
        }
        .stay-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        }
        .stay-btn:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
}

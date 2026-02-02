/**
 * TeaserCards - Landing page persona cards with demand tracking
 * Families = live demo, Roommates/Just Me = coming soon with demand capture
 */

import { useState } from "preact/hooks";

interface DemandModalState {
  isOpen: boolean;
  feature: "roommates" | "just_me" | null;
}

export default function TeaserCards() {
  const [modal, setModal] = useState<DemandModalState>({ isOpen: false, feature: null });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trackDemandSignal = async (feature: string, userEmail?: string) => {
    // Client-side deduplication
    const storageKey = `demand_${feature}_clicked`;
    if (typeof localStorage !== "undefined" && localStorage.getItem(storageKey)) {
      return; // Already tracked
    }

    try {
      // Get or create session ID for anonymous tracking
      let sessionId = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("demand_session_id")
        : null;
      if (!sessionId && typeof sessionStorage !== "undefined") {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("demand_session_id", sessionId);
      }

      await fetch("/api/demand-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature,
          email: userEmail || undefined,
          session_id: sessionId,
        }),
      });

      // Mark as tracked
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, "true");
      }
    } catch (error) {
      console.error("Failed to track demand signal:", error);
    }
  };

  const handleCardClick = (feature: "families" | "roommates" | "just_me") => {
    if (feature === "families") {
      // Scroll to demo section
      const demoSection = document.querySelector(".demo-section");
      demoSection?.scrollIntoView({ behavior: "smooth" });
    } else {
      // Track click and show modal
      trackDemandSignal(feature);
      setModal({ isOpen: true, feature });
    }
  };

  const handleSubmitEmail = async () => {
    if (!modal.feature || !email) return;

    setIsSubmitting(true);
    await trackDemandSignal(modal.feature, email);
    setSubmitted(prev => new Set(prev).add(modal.feature!));
    setIsSubmitting(false);
    setEmail("");

    // Close modal after brief delay
    setTimeout(() => {
      setModal({ isOpen: false, feature: null });
    }, 1500);
  };

  const closeModal = () => {
    setModal({ isOpen: false, feature: null });
  };

  return (
    <>
      <div class="teaser-cards">
        {/* Families - Live */}
        <div class="teaser-card teaser-card-live" onClick={() => handleCardClick("families")}>
          <div class="card-emoji">👨‍👩‍👧‍👦</div>
          <h3 class="card-title">Families</h3>
          <p class="card-desc">Kids earn points for chores. Parents track progress.</p>
          <button class="card-cta card-cta-primary">Try Demo</button>
        </div>

        {/* Roommates - Coming Soon */}
        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("roommates")}>
          <div class="card-badge">Coming Soon</div>
          <div class="card-emoji">🏠</div>
          <h3 class="card-title">Roommates</h3>
          <p class="card-desc">Fair splits without nagging. Automatic rotation.</p>
          <button class="card-cta card-cta-secondary">Learn more</button>
        </div>

        {/* Just Me - Coming Soon */}
        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("just_me")}>
          <div class="card-badge">Coming Soon</div>
          <div class="card-emoji">👤</div>
          <h3 class="card-title">Just Me</h3>
          <p class="card-desc">Stay on top of your tasks. Simple and focused.</p>
          <button class="card-cta card-cta-secondary">Learn more</button>
        </div>
      </div>

      {/* Coming Soon Modal */}
      {modal.isOpen && modal.feature && (
        <div class="modal-overlay" onClick={closeModal}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <button class="modal-close" onClick={closeModal}>×</button>

            <div class="modal-emoji">
              {modal.feature === "roommates" ? "🏠" : "👤"}
            </div>
            <h2 class="modal-title">
              {modal.feature === "roommates" ? "Roommates Mode" : "Just Me Mode"}
            </h2>

            {submitted.has(modal.feature) ? (
              <div class="modal-success">
                <span class="success-icon">✓</span>
                <p>Thanks! We'll let you know when it's ready.</p>
              </div>
            ) : (
              <>
                <p class="modal-desc">
                  {modal.feature === "roommates"
                    ? "Fair task splitting without the nagging. Perfect for apartments, couples, and shared houses."
                    : "Personal task management for teens, students, and busy adults. Stay organized, your way."}
                </p>

                <div class="modal-features">
                  <h4>Features:</h4>
                  <ul>
                    {modal.feature === "roommates" ? (
                      <>
                        <li>Fairness meter (not competition)</li>
                        <li>Automatic task rotation</li>
                        <li>Optional bill splitting</li>
                      </>
                    ) : (
                      <>
                        <li>Simple daily task lists</li>
                        <li>Optional streak tracking</li>
                        <li>Shopping & homework lists</li>
                      </>
                    )}
                  </ul>
                </div>

                <div class="modal-notify">
                  <p class="notify-label">Want early access? (optional)</p>
                  <input
                    type="email"
                    class="notify-input"
                    placeholder="email@example.com"
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  />
                  <div class="notify-buttons">
                    <button
                      class="btn btn-primary"
                      onClick={handleSubmitEmail}
                      disabled={isSubmitting || !email}
                    >
                      {isSubmitting ? "Sending..." : "Notify Me"}
                    </button>
                    <button class="btn btn-ghost" onClick={closeModal}>
                      Maybe Later
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .teaser-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          max-width: 700px;
          margin: 0 auto;
        }

        .teaser-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          position: relative;
        }
        .teaser-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .teaser-card-live {
          border-color: var(--color-primary, #10b981);
        }
        .teaser-card-live:hover {
          border-color: #059669;
        }
        .teaser-card-soon {
          border-color: #e5e7eb;
        }
        .teaser-card-soon:hover {
          border-color: #d1d5db;
        }

        .card-badge {
          position: absolute;
          top: -8px;
          right: 12px;
          background: #f3f4f6;
          color: #6b7280;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .card-emoji {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text, #064e3b);
          margin: 0 0 0.5rem;
        }
        .card-desc {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 1rem;
          line-height: 1.4;
        }

        .card-cta {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .card-cta-primary {
          background: var(--color-primary, #10b981);
          color: white;
        }
        .card-cta-primary:hover {
          background: #059669;
        }
        .card-cta-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }
        .card-cta-secondary:hover {
          background: #e5e7eb;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
        }
        .modal-close:hover {
          color: #4b5563;
        }

        .modal-emoji {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          color: var(--color-text, #064e3b);
          margin: 0 0 1rem;
        }
        .modal-desc {
          text-align: center;
          color: #4b5563;
          margin: 0 0 1rem;
          line-height: 1.5;
        }

        .modal-features {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .modal-features h4 {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: var(--color-text, #064e3b);
        }
        .modal-features ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #4b5563;
          font-size: 0.875rem;
        }
        .modal-features li {
          margin-bottom: 0.25rem;
        }

        .modal-notify {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }
        .notify-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 0.5rem;
        }
        .notify-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }
        .notify-input:focus {
          outline: none;
          border-color: var(--color-primary, #10b981);
        }
        .notify-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .btn {
          flex: 1;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: var(--color-primary, #10b981);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #059669;
        }
        .btn-ghost {
          background: transparent;
          color: #6b7280;
        }
        .btn-ghost:hover {
          background: #f3f4f6;
        }

        .modal-success {
          text-align: center;
          padding: 2rem 0;
        }
        .success-icon {
          display: inline-flex;
          width: 48px;
          height: 48px;
          background: var(--color-primary, #10b981);
          color: white;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .modal-success p {
          color: #4b5563;
          margin: 0;
        }
      `}</style>
    </>
  );
}

/**
 * TeaserCards - Landing page persona cards with assessment quiz for demand capture
 * Families = live demo, Roommates/Just Me = 3-question assessment → email capture
 */

import { useState } from "preact/hooks";

type Feature = "roommates" | "just_me";
type Step = "closed" | "q1" | "q2" | "q3" | "result";

interface Assessment {
  q1: string;
  q2: string;
  q3: string;
}

// Assessment questions by feature
const QUESTIONS: Record<Feature, { q1: Question; q2: Question; q3: Question }> = {
  roommates: {
    q1: {
      text: "How do you currently split chores?",
      options: [
        { value: "none", label: "We don't really", emoji: "😅" },
        { value: "informal", label: "Informal agreement", emoji: "🤝" },
        { value: "rotating", label: "Rotating schedule", emoji: "🔄" },
        { value: "app", label: "Use an app", emoji: "📱" },
      ],
    },
    q2: {
      text: "What's your biggest frustration?",
      options: [
        { value: "unfair", label: "It feels unfair", emoji: "⚖️" },
        { value: "nagging", label: "Having to nag", emoji: "😤" },
        { value: "forgetting", label: "People forget", emoji: "🤷" },
        { value: "no_system", label: "No system at all", emoji: "🌀" },
      ],
    },
    q3: {
      text: "How many people in your household?",
      options: [
        { value: "2", label: "Just 2 of us", emoji: "👫" },
        { value: "3-4", label: "3-4 people", emoji: "👥" },
        { value: "5+", label: "5 or more", emoji: "🏠" },
      ],
    },
  },
  just_me: {
    q1: {
      text: "How do you currently track tasks?",
      options: [
        { value: "mental", label: "In my head", emoji: "🧠" },
        { value: "paper", label: "Paper/sticky notes", emoji: "📝" },
        { value: "phone", label: "Phone notes", emoji: "📱" },
        { value: "app", label: "Task app", emoji: "✅" },
      ],
    },
    q2: {
      text: "What's your biggest challenge?",
      options: [
        { value: "forgetting", label: "Forgetting tasks", emoji: "🤦" },
        { value: "motivation", label: "Staying motivated", emoji: "😴" },
        { value: "overwhelmed", label: "Too many tasks", emoji: "😰" },
        { value: "starting", label: "Getting started", emoji: "🐌" },
      ],
    },
    q3: {
      text: "What do you want to improve most?",
      options: [
        { value: "habits", label: "Daily habits", emoji: "🌅" },
        { value: "cleaning", label: "Cleaning routine", emoji: "🧹" },
        { value: "work", label: "Work/study tasks", emoji: "💼" },
        { value: "everything", label: "All of the above", emoji: "🎯" },
      ],
    },
  },
};

interface Question {
  text: string;
  options: { value: string; label: string; emoji: string }[];
}

// Calculate result type based on answers
function getResultType(feature: Feature, answers: Assessment): string {
  if (feature === "roommates") {
    if (answers.q2 === "unfair") return "fair_seeker";
    if (answers.q2 === "nagging") return "peace_keeper";
    if (answers.q1 === "none" || answers.q2 === "no_system") return "system_builder";
    return "optimizer";
  } else {
    if (answers.q2 === "motivation") return "motivation_seeker";
    if (answers.q2 === "overwhelmed") return "overwhelmed_organizer";
    if (answers.q2 === "forgetting") return "memory_helper";
    return "habit_builder";
  }
}

// Result messages by type
const RESULTS: Record<string, { title: string; desc: string }> = {
  fair_seeker: { title: "The Fair Seeker", desc: "You value equality. Roommates Mode tracks contributions so everyone does their share." },
  peace_keeper: { title: "The Peace Keeper", desc: "You're tired of nagging. Automatic reminders mean you don't have to be the bad guy." },
  system_builder: { title: "The System Builder", desc: "You need structure. Roommates Mode creates a clear, rotating schedule for everyone." },
  optimizer: { title: "The Optimizer", desc: "You want better. Roommates Mode takes your current system to the next level." },
  motivation_seeker: { title: "The Motivation Seeker", desc: "Streaks and progress tracking will keep you going. Small wins add up!" },
  overwhelmed_organizer: { title: "The Overwhelmed Organizer", desc: "Simple daily lists cut through the noise. Focus on what matters today." },
  memory_helper: { title: "The Memory Helper", desc: "Smart reminders at the right time mean nothing falls through the cracks." },
  habit_builder: { title: "The Habit Builder", desc: "Build lasting routines with gentle nudges and visible progress." },
};

export default function TeaserCards() {
  const [feature, setFeature] = useState<Feature | null>(null);
  const [step, setStep] = useState<Step>("closed");
  const [answers, setAnswers] = useState<Assessment>({ q1: "", q2: "", q3: "" });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDemandSignal = async (userEmail?: string) => {
    try {
      let sessionId = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("demand_session_id")
        : null;
      if (!sessionId && typeof sessionStorage !== "undefined") {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("demand_session_id", sessionId);
      }

      const resultType = feature ? getResultType(feature, answers) : undefined;

      // Collect navigator details for analytics
      const nav = typeof navigator !== "undefined" ? {
        language: navigator.language,
        languages: navigator.languages?.slice(0, 3),
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookieEnabled: navigator.cookieEnabled,
        online: navigator.onLine,
        screen: typeof screen !== "undefined" ? {
          width: screen.width,
          height: screen.height,
          pixelRatio: window.devicePixelRatio,
        } : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      } : undefined;

      await fetch("/api/demand-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          v: 2,
          feature,
          email: userEmail || undefined,
          session_id: sessionId,
          assessment: answers.q1 ? answers : undefined,
          result_type: resultType,
          navigator: nav,
        }),
      });
    } catch (error) {
      console.error("Failed to track demand signal:", error);
    }
  };

  const handleCardClick = (f: "families" | Feature) => {
    if (f === "families") {
      document.querySelector(".demo-section")?.scrollIntoView({ behavior: "smooth" });
    } else {
      setFeature(f);
      setStep("q1");
      setAnswers({ q1: "", q2: "", q3: "" });
      setSubmitted(false);
    }
  };

  const handleAnswer = (question: "q1" | "q2" | "q3", value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
    // Auto-advance to next step
    if (question === "q1") setStep("q2");
    else if (question === "q2") setStep("q3");
    else {
      setStep("result");
      submitDemandSignal(); // Track completion without email
    }
  };

  const handleSubmitEmail = async () => {
    if (!email) return;
    setIsSubmitting(true);
    await submitDemandSignal(email);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setStep("closed");
    setFeature(null);
    setEmail("");
  };

  const currentQuestion = feature && step !== "closed" && step !== "result"
    ? QUESTIONS[feature][step]
    : null;

  const resultType = feature ? getResultType(feature, answers) : "";
  const result = RESULTS[resultType];

  return (
    <>
      <div class="teaser-cards">
        <div class="teaser-card teaser-card-live" onClick={() => handleCardClick("families")}>
          <div class="card-emoji">👨‍👩‍👧‍👦</div>
          <h3 class="card-title">Families</h3>
          <p class="card-desc">Kids earn points for chores. Parents track progress.</p>
          <button class="card-cta card-cta-primary">Try Demo</button>
        </div>

        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("roommates")}>
          <div class="card-emoji">🏠</div>
          <h3 class="card-title">Roommates</h3>
          <p class="card-desc">Fair splits without nagging. Automatic rotation.</p>
          <button class="card-cta card-cta-secondary">Get early access</button>
        </div>

        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("just_me")}>
          <div class="card-emoji">👤</div>
          <h3 class="card-title">Just Me</h3>
          <p class="card-desc">Stay on top of your tasks. Simple and focused.</p>
          <button class="card-cta card-cta-secondary">Get early access</button>
        </div>
      </div>

      {/* Assessment Modal */}
      {step !== "closed" && feature && (
        <div class="modal-overlay" onClick={closeModal}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <button class="modal-close" onClick={closeModal}>×</button>

            {/* Progress indicator */}
            <div class="quiz-progress">
              <div class={`progress-dot ${step === "q1" ? "active" : answers.q1 ? "done" : ""}`} />
              <div class={`progress-dot ${step === "q2" ? "active" : answers.q2 ? "done" : ""}`} />
              <div class={`progress-dot ${step === "q3" ? "active" : answers.q3 ? "done" : ""}`} />
            </div>

            {/* Question */}
            {currentQuestion && (
              <div class="quiz-question">
                <h2 class="question-text">{currentQuestion.text}</h2>
                <div class="quiz-options">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.value}
                      class="quiz-option"
                      onClick={() => handleAnswer(step as "q1" | "q2" | "q3", opt.value)}
                    >
                      <span class="option-emoji">{opt.emoji}</span>
                      <span class="option-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {step === "result" && result && (
              <div class="quiz-result">
                {submitted ? (
                  <div class="result-success">
                    <span class="success-icon">✓</span>
                    <h2>You're on the list!</h2>
                    <p>We'll notify you when {feature === "roommates" ? "Roommates" : "Just Me"} Mode launches.</p>
                  </div>
                ) : (
                  <>
                    <div class="result-badge">{result.title}</div>
                    <p class="result-desc">{result.desc}</p>

                    <div class="result-cta">
                      <p class="cta-label">Get early access when we launch:</p>
                      <input
                        type="email"
                        class="email-input"
                        placeholder="your@email.com"
                        value={email}
                        onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                      />
                      <button
                        class="btn btn-primary"
                        onClick={handleSubmitEmail}
                        disabled={isSubmitting || !email}
                      >
                        {isSubmitting ? "..." : "Notify Me"}
                      </button>
                      <button class="btn btn-ghost" onClick={closeModal}>
                        Maybe later
                      </button>
                    </div>
                  </>
                )}
              </div>
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
        }
        .teaser-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .teaser-card-live { border-color: var(--color-primary, #10b981); }
        .teaser-card-live:hover { border-color: #059669; }
        .teaser-card-soon { border-color: #e5e7eb; }
        .teaser-card-soon:hover { border-color: #d1d5db; }
        .card-emoji { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .card-title { font-size: 1.125rem; font-weight: 700; color: var(--color-text, #064e3b); margin: 0 0 0.5rem; }
        .card-desc { font-size: 0.875rem; color: #6b7280; margin: 0 0 1rem; line-height: 1.4; }
        .card-cta { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; border: none; }
        .card-cta-primary { background: var(--color-primary, #10b981); color: white; }
        .card-cta-primary:hover { background: #059669; }
        .card-cta-secondary { background: #f3f4f6; color: #4b5563; }
        .card-cta-secondary:hover { background: #e5e7eb; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; }
        .modal-content { background: white; border-radius: 16px; padding: 2rem; max-width: 400px; width: 100%; position: relative; }
        .modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; color: #9ca3af; cursor: pointer; }
        .modal-close:hover { color: #4b5563; }

        /* Progress dots */
        .quiz-progress { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        .progress-dot { width: 10px; height: 10px; border-radius: 50%; background: #e5e7eb; transition: all 0.2s; }
        .progress-dot.active { background: var(--color-primary, #10b981); transform: scale(1.2); }
        .progress-dot.done { background: var(--color-primary, #10b981); }

        /* Question */
        .question-text { font-size: 1.25rem; font-weight: 600; text-align: center; color: var(--color-text, #064e3b); margin: 0 0 1.5rem; }
        .quiz-options { display: flex; flex-direction: column; gap: 0.75rem; }
        .quiz-option { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: left; }
        .quiz-option:hover { border-color: var(--color-primary, #10b981); background: #f0fdf4; }
        .option-emoji { font-size: 1.5rem; }
        .option-label { font-weight: 500; color: var(--color-text, #064e3b); }

        /* Result */
        .quiz-result { text-align: center; }
        .result-badge { display: inline-block; background: linear-gradient(135deg, var(--color-primary, #10b981), #059669); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600; margin-bottom: 1rem; }
        .result-desc { color: #4b5563; margin: 0 0 1.5rem; line-height: 1.5; }
        .result-cta { border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
        .cta-label { font-size: 0.875rem; color: #6b7280; margin: 0 0 0.75rem; }
        .email-input { width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; margin-bottom: 0.75rem; }
        .email-input:focus { outline: none; border-color: var(--color-primary, #10b981); }
        .btn { width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--color-primary, #10b981); color: white; }
        .btn-primary:hover:not(:disabled) { background: #059669; }
        .btn-ghost { background: transparent; color: #6b7280; }
        .btn-ghost:hover { background: #f3f4f6; }

        /* Success */
        .result-success { padding: 1rem 0; }
        .success-icon { display: inline-flex; width: 48px; height: 48px; background: var(--color-primary, #10b981); color: white; border-radius: 50%; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem; }
        .result-success h2 { font-size: 1.25rem; color: var(--color-text, #064e3b); margin: 0 0 0.5rem; }
        .result-success p { color: #6b7280; margin: 0; }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .teaser-card { background: #1e293b; }
          .teaser-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
          .teaser-card-live { border-color: #3b82f6; }
          .teaser-card-live:hover { border-color: #60a5fa; }
          .teaser-card-soon { border-color: #334155; }
          .teaser-card-soon:hover { border-color: #475569; }
          .card-title { color: #f1f5f9; }
          .card-desc { color: #94a3b8; }
          .card-cta-primary { background: #3b82f6; }
          .card-cta-primary:hover { background: #2563eb; }
          .card-cta-secondary { background: #334155; color: #cbd5e1; }
          .card-cta-secondary:hover { background: #475569; }
          .modal-overlay { background: rgba(0,0,0,0.7); }
          .modal-content { background: #1e293b; }
          .modal-close { color: #64748b; }
          .modal-close:hover { color: #94a3b8; }
          .progress-dot { background: #334155; }
          .progress-dot.active, .progress-dot.done { background: #3b82f6; }
          .question-text { color: #f1f5f9; }
          .quiz-option { background: #0f172a; border-color: #334155; }
          .quiz-option:hover { border-color: #3b82f6; background: #1e3a5f; }
          .option-label { color: #f1f5f9; }
          .result-badge { background: linear-gradient(135deg, #3b82f6, #2563eb); }
          .result-desc { color: #94a3b8; }
          .result-cta { border-color: #334155; }
          .cta-label { color: #94a3b8; }
          .email-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .email-input:focus { border-color: #3b82f6; }
          .btn-primary { background: #3b82f6; }
          .btn-primary:hover:not(:disabled) { background: #2563eb; }
          .btn-ghost { color: #94a3b8; }
          .btn-ghost:hover { background: #334155; }
          .success-icon { background: #3b82f6; }
          .result-success h2 { color: #f1f5f9; }
          .result-success p { color: #94a3b8; }
        }
      `}</style>
    </>
  );
}

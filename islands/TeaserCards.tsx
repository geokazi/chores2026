/**
 * TeaserCards - Landing page persona cards with assessment quiz for demand capture
 * Families/Roommates/Just Me = 3-question assessment → personalized result → email capture
 * Research: Emotional language + 13 persona types for 40%+ conversion
 */

import { useState } from "preact/hooks";

type Feature = "families" | "roommates" | "just_me";
type Step = "closed" | "q1" | "q2" | "q3" | "result";

interface Assessment {
  q1: string;
  q2: string;
  q3: string;
}

interface Question {
  text: string;
  options: { value: string; label: string; emoji: string }[];
}

// Assessment questions by feature - using emotional language from research
const QUESTIONS: Record<Feature, { q1: Question; q2: Question; q3: Question }> = {
  families: {
    q1: {
      text: "How do your kids respond when asked to do chores?",
      options: [
        { value: "unfair", label: "\"That's not fair! Why do I have to?\"", emoji: "😤" },
        { value: "forgot", label: "\"I forgot\" / \"I didn't know\"", emoji: "🤷" },
        { value: "eventually", label: "They do them... after the 5th reminder", emoji: "😩" },
        { value: "negotiate", label: "Endless negotiation and arguments", emoji: "🗣️" },
      ],
    },
    q2: {
      text: "What would make the biggest difference?",
      options: [
        { value: "initiative", label: "Kids taking initiative without being asked", emoji: "🌟" },
        { value: "fair_distribution", label: "Fair distribution everyone agrees on", emoji: "⚖️" },
        { value: "clear_expectations", label: "Clear expectations with no confusion", emoji: "📋" },
        { value: "real_motivation", label: "Rewards that actually motivate them", emoji: "🎯" },
      ],
    },
    q3: {
      text: "How many kids do you have at home?",
      options: [
        { value: "1", label: "1 child", emoji: "👧" },
        { value: "2", label: "2 children", emoji: "👧👦" },
        { value: "3-4", label: "3-4 children", emoji: "👨‍👩‍👧‍👦" },
        { value: "5+", label: "5+ children", emoji: "🏠" },
      ],
    },
  },
  roommates: {
    q1: {
      text: "How do you currently handle chores?",
      options: [
        { value: "none", label: "Wing it - whoever notices does it", emoji: "😅" },
        { value: "verbal", label: "Verbal agreements that get forgotten", emoji: "🗣️" },
        { value: "list", label: "Written list on fridge that's ignored", emoji: "📝" },
        { value: "i_do_it", label: "Honestly, I do most of it to avoid conflict", emoji: "😤" },
      ],
    },
    q2: {
      text: "What causes the most tension?",
      options: [
        { value: "unfair", label: "Someone always does less than their share", emoji: "⚖️" },
        { value: "passive_aggressive", label: "Passive-aggressive notes or awkward talks", emoji: "😬" },
        { value: "avoiding", label: "Avoiding the conversation altogether", emoji: "🙈" },
        { value: "standards", label: "Different cleanliness standards", emoji: "🧹" },
      ],
    },
    q3: {
      text: "How many people share your place?",
      options: [
        { value: "2", label: "Just 2 of us", emoji: "👫" },
        { value: "3-4", label: "3-4 people", emoji: "👥" },
        { value: "5+", label: "5 or more", emoji: "🏠" },
      ],
    },
  },
  just_me: {
    q1: {
      text: "What makes managing your place hardest?",
      options: [
        { value: "motivation", label: "Lack of motivation when it's just me", emoji: "😴" },
        { value: "overwhelmed", label: "Feeling overwhelmed by everything", emoji: "😰" },
        { value: "forgetting", label: "Forgetting tasks until they're urgent", emoji: "🤦" },
        { value: "procrastinating", label: "Procrastinating - no one sees the mess", emoji: "🛋️" },
      ],
    },
    q2: {
      text: "What would help you most?",
      options: [
        { value: "reminders", label: "Gentle reminders that keep me on track", emoji: "🔔" },
        { value: "small_chunks", label: "Breaking big tasks into small chunks", emoji: "✂️" },
        { value: "gamification", label: "Making it feel rewarding, like a game", emoji: "🎮" },
        { value: "progress", label: "Seeing my progress visually", emoji: "📊" },
      ],
    },
    q3: {
      text: "Which best describes you?",
      options: [
        { value: "alone_choice", label: "Living alone by choice", emoji: "🏡" },
        { value: "partner_away", label: "Partner travels or works opposite hours", emoji: "✈️" },
        { value: "recently_single", label: "Recently on my own", emoji: "🌱" },
        { value: "minimalist", label: "Minimalist trying to simplify", emoji: "🧘" },
      ],
    },
  },
};

// Calculate result type based on answers - 13 persona types
function getResultType(feature: Feature, answers: Assessment): string {
  if (feature === "families") {
    // 5 family personas
    if (answers.q1 === "unfair" || answers.q2 === "fair_distribution") return "fairness_seeker";
    if (answers.q1 === "eventually") return "reminder_weary";
    if (answers.q1 === "negotiate") return "negotiation_exhausted";
    if (answers.q1 === "forgot" || answers.q2 === "clear_expectations") return "system_builder";
    if (answers.q2 === "real_motivation") return "motivation_maker";
    return "system_builder"; // default
  } else if (feature === "roommates") {
    // 4 roommate personas
    if (answers.q2 === "unfair") return "fair_seeker";
    if (answers.q2 === "avoiding" || answers.q2 === "passive_aggressive") return "peace_keeper";
    if (answers.q1 === "none" || answers.q2 === "standards") return "system_builder";
    if (answers.q1 === "i_do_it") return "lone_warrior";
    return "optimizer";
  } else {
    // 4 just me personas
    if (answers.q1 === "motivation" || answers.q2 === "gamification") return "motivation_seeker";
    if (answers.q1 === "overwhelmed" || answers.q2 === "small_chunks") return "overwhelmed_organizer";
    if (answers.q1 === "forgetting" || answers.q2 === "reminders") return "memory_helper";
    if (answers.q1 === "procrastinating" || answers.q2 === "progress") return "habit_builder";
    return "habit_builder";
  }
}

// Result messages - expanded with emotional copy framework
// Structure: affirm struggle → show gap → provide hope
const RESULTS: Record<string, { title: string; desc: string; hook: string }> = {
  // Families (5 types)
  fairness_seeker: {
    title: "The Fairness Champion",
    desc: "Your kids care deeply about fairness - and they're right to. The problem isn't their attitude, it's that they can't see who's really doing what. With visible task tracking, \"that's not fair\" becomes \"okay, I get it.\"",
    hook: "Turn fairness complaints into motivation.",
  },
  reminder_weary: {
    title: "The Reminder-Weary Parent",
    desc: "You're exhausted from saying the same things over and over. What if the app reminded them instead of you? Automatic notifications mean you never have to be the nag again. Your relationship improves when you're not the chore police.",
    hook: "Imagine never saying \"did you do your chores?\" again.",
  },
  negotiation_exhausted: {
    title: "The Peace Seeker",
    desc: "Every chore request turns into a negotiation. It's draining. What if there was nothing to argue about? Clear rules, rotating schedules, and instant rewards mean the system is the authority - not you. End the daily battles.",
    hook: "Stop the arguments before they start.",
  },
  system_builder: {
    title: "The Structure Creator",
    desc: "You know a good system would fix everything, but building one from scratch is overwhelming. We've done the hard work. Pre-built templates, automatic rotation, and clear expectations - all ready to go. Structure without the stress.",
    hook: "Finally, a system that actually works.",
  },
  motivation_maker: {
    title: "The Motivation Master",
    desc: "Sticker charts stopped working years ago. Your kids need real motivation that actually matters to them. Points they can trade for rewards they choose, streaks that build pride, and visible progress that makes chores feel like leveling up.",
    hook: "Rewards they'll actually work for.",
  },

  // Roommates (4 types)
  fair_seeker: {
    title: "The Fair Seeker",
    desc: "You're tired of keeping score in your head - and resenting it. Objective tracking stops \"I did more than you\" arguments before they start. Everyone can see the data. No more guessing, no more resentment.",
    hook: "Finally, proof of who's pulling their weight.",
  },
  peace_keeper: {
    title: "The Peace Keeper",
    desc: "You hate conflict, so you either do it yourself or let things slide. What if the app was the bad guy instead of you? Automatic assignments and reminders mean you never have to have that awkward conversation again.",
    hook: "Let the app be the bad guy.",
  },
  lone_warrior: {
    title: "The Lone Warrior",
    desc: "You've been doing most of the work to keep the peace, but you're burning out. It's not sustainable. With visible contribution tracking, your roommates will finally see what you've been carrying. Time to share the load.",
    hook: "You deserve backup.",
  },
  optimizer: {
    title: "The Optimizer",
    desc: "You have a system that mostly works, but it could be better. Small improvements add up. Automatic rotation, smart reminders, and a fairness score take your current setup to the next level without starting over.",
    hook: "Good to great, without the hassle.",
  },

  // Just Me (4 types)
  motivation_seeker: {
    title: "The Motivation Seeker",
    desc: "When no one else sees the mess, it's hard to care. But what if cleaning felt like a game? Streaks, points, and visible progress turn solo chores into personal achievements. You're not cleaning for anyone else - you're leveling up.",
    hook: "Make it a game you want to play.",
  },
  overwhelmed_organizer: {
    title: "The Overwhelmed Organizer",
    desc: "Looking at everything that needs doing paralyzes you. The secret isn't doing more - it's doing the right thing, right now. Simple daily lists cut through the noise. Just one task at a time. You've got this.",
    hook: "One task at a time. That's all.",
  },
  memory_helper: {
    title: "The Memory Helper",
    desc: "Your brain has enough to remember without tracking when you last cleaned the bathroom. Smart reminders at exactly the right time mean nothing falls through the cracks. Free up mental space for things that matter.",
    hook: "Your brain has better things to do.",
  },
  habit_builder: {
    title: "The Habit Builder",
    desc: "You know consistency is key, but starting is the hardest part. Small wins build momentum. A simple streak counter and gentle daily nudges help you build lasting routines without overwhelming willpower. Start small, stay consistent.",
    hook: "Small wins, big momentum.",
  },
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

  const handleCardClick = (f: Feature) => {
    setFeature(f);
    setStep("q1");
    setAnswers({ q1: "", q2: "", q3: "" });
    setSubmitted(false);
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

  const handleSkipToDemo = () => {
    closeModal();
    document.querySelector(".demo-section")?.scrollIntoView({ behavior: "smooth" });
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

  const getFeatureLabel = (f: Feature) => {
    if (f === "families") return "Families";
    if (f === "roommates") return "Roommates";
    return "Just Me";
  };

  return (
    <>
      <div class="teaser-cards">
        <div class="teaser-card teaser-card-live" onClick={() => handleCardClick("families")}>
          <div class="card-emoji">👨‍👩‍👧‍👦</div>
          <h3 class="card-title">Families</h3>
          <p class="card-desc">Kids earn points for chores. Parents track progress.</p>
          <button class="card-cta card-cta-primary">See if it's for you</button>
        </div>

        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("roommates")}>
          <div class="card-emoji">🏠</div>
          <h3 class="card-title">Roommates</h3>
          <p class="card-desc">Fair splits without the awkward conversations.</p>
          <button class="card-cta card-cta-secondary">See if it's for you</button>
        </div>

        <div class="teaser-card teaser-card-soon" onClick={() => handleCardClick("just_me")}>
          <div class="card-emoji">👤</div>
          <h3 class="card-title">Just Me</h3>
          <p class="card-desc">Stay on top of tasks without the mental load.</p>
          <button class="card-cta card-cta-secondary">See if it's for you</button>
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
                    <p>We'll notify you when {getFeatureLabel(feature)} Mode launches.</p>
                    {feature === "families" && (
                      <button class="btn btn-secondary" onClick={handleSkipToDemo}>
                        Try the demo now
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div class="result-badge">{result.title}</div>
                    <p class="result-hook">{result.hook}</p>
                    <p class="result-desc">{result.desc}</p>

                    <div class="result-cta">
                      {feature === "families" ? (
                        <>
                          <button class="btn btn-primary" onClick={handleSkipToDemo}>
                            Try the demo
                          </button>
                          <div class="or-divider"><span>or</span></div>
                          <p class="cta-label">Get tips for {result.title.toLowerCase()}s:</p>
                        </>
                      ) : (
                        <p class="cta-label">Get early access when we launch:</p>
                      )}
                      <input
                        type="email"
                        class="email-input"
                        placeholder="your@email.com"
                        value={email}
                        onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitEmail()}
                      />
                      <button
                        class="btn btn-primary"
                        onClick={handleSubmitEmail}
                        disabled={isSubmitting || !email}
                      >
                        {isSubmitting ? "..." : feature === "families" ? "Send me tips" : "Notify Me"}
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
        .modal-content { background: white; border-radius: 16px; padding: 2rem; max-width: 440px; width: 100%; position: relative; max-height: 90vh; overflow-y: auto; }
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
        .option-emoji { font-size: 1.5rem; flex-shrink: 0; }
        .option-label { font-weight: 500; color: var(--color-text, #064e3b); line-height: 1.3; }

        /* Result */
        .quiz-result { text-align: center; }
        .result-badge { display: inline-block; background: linear-gradient(135deg, var(--color-primary, #10b981), #059669); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600; margin-bottom: 0.75rem; }
        .result-hook { font-size: 1.1rem; font-weight: 600; color: var(--color-text, #064e3b); margin: 0 0 0.75rem; }
        .result-desc { color: #4b5563; margin: 0 0 1.5rem; line-height: 1.6; font-size: 0.95rem; text-align: left; }
        .result-cta { border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
        .cta-label { font-size: 0.875rem; color: #6b7280; margin: 0 0 0.75rem; }
        .email-input { width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; margin-bottom: 0.75rem; box-sizing: border-box; }
        .email-input:focus { outline: none; border-color: var(--color-primary, #10b981); }
        .btn { width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--color-primary, #10b981); color: white; }
        .btn-primary:hover:not(:disabled) { background: #059669; }
        .btn-secondary { background: #f3f4f6; color: var(--color-text, #064e3b); margin-top: 1rem; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-ghost { background: transparent; color: #6b7280; }
        .btn-ghost:hover { background: #f3f4f6; }

        .or-divider { display: flex; align-items: center; gap: 1rem; margin: 1rem 0; color: #9ca3af; font-size: 0.875rem; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

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
          .result-hook { color: #f1f5f9; }
          .result-desc { color: #94a3b8; }
          .result-cta { border-color: #334155; }
          .cta-label { color: #94a3b8; }
          .email-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .email-input:focus { border-color: #3b82f6; }
          .btn-primary { background: #3b82f6; }
          .btn-primary:hover:not(:disabled) { background: #2563eb; }
          .btn-secondary { background: #334155; color: #f1f5f9; }
          .btn-secondary:hover { background: #475569; }
          .btn-ghost { color: #94a3b8; }
          .btn-ghost:hover { background: #334155; }
          .or-divider { color: #64748b; }
          .or-divider::before, .or-divider::after { background: #334155; }
          .success-icon { background: #3b82f6; }
          .result-success h2 { color: #f1f5f9; }
          .result-success p { color: #94a3b8; }
        }
      `}</style>
    </>
  );
}

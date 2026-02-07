/**
 * Family-Focused Landing Page
 * /families - Optimized for Amazon gift card traffic
 * Emotional messaging, points explanation, gift redemption CTA
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { isStaffEmail } from "../lib/auth/staff.ts";
import LandingDemo from "../islands/LandingDemo.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";

interface FamiliesPageData {
  isLoggedIn: boolean;
  userEmail?: string;
}

export const handler: Handlers<FamiliesPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    // Staff users go to admin dashboard
    if (session.isAuthenticated && session.user?.email && isStaffEmail(session.user.email)) {
      return new Response(null, { status: 303, headers: { Location: "/admin" } });
    }

    // Authenticated users with family go to main app
    if (session.isAuthenticated && session.family) {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    // Authenticated but no family → complete setup
    if (session.isAuthenticated && !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/setup" } });
    }

    return ctx.render({
      isLoggedIn: session.isAuthenticated,
      userEmail: session.user?.email,
    });
  },
};

export default function FamiliesLandingPage({ data }: PageProps<FamiliesPageData>) {
  const { isLoggedIn, userEmail } = data;

  return (
    <div class="landing-page">
      <script src="/oauth-fragment-handler.js"></script>

      {/* Header */}
      <header class="landing-header">
        <div class="landing-logo">
          <svg class="logo-icon" viewBox="0 0 1024 1024" fill="currentColor">
            <path d="M253 195c7 2 14 5 21 7l6 2c9 4 19 7 28 11 5 2 10 4 15 5 10 4 20 7 31 11 19 7 38 14 58 21l10 4c10 3 19 7 29 10l7 2c2 1 4 2 6 2 9 3 14 7 20 13l2 2c2 2 3 3 5 5l4 4 2 2c3 3 7 7 10 10l2 2c4 4 8 9 13 13 1 2 1 2 1 4l2 1c2 1 4 2 6 4l2 2 2 2 2 2c3 3 6 6 9 10 3 3 5 5 8 8 6 5 11 11 16 17 3 3 6 7 9 10 2 2 4 4 6 7 2 3 5 5 7 8l2 2c2 1 2 1 4 2 2-1 4-1 6-2 4-2 8-4 12-6 2-1 4-2 5-3 3-2 6-4 9-5 4-3 8-5 12-8 17-10 33-21 50-31 8-5 17-11 25-16 5-3 11-7 16-10l3-2c2-2 5-3 7-5l3-2c1-1 2-2 4-2 4-3 7-4 12-3 3 2 5 4 7 6l2 2c2 1 3 3 5 5 0 1 0 1 0 2h2v2l2 1c3 2 6 5 9 7 3 4 7 7 11 11 5 4 9 9 14 14 4 4 8 7 12 11 4 3 7 7 10 10 2 2 5 4 7 7 5 4 9 9 14 13l2 2 3 2 2 2c2 3 2 4 2 7-1 1-1 1-2 2h-3l-3-1h-4l-3-1h-4c-3 0-6 0-9 0-4 0-7 0-10 0-24 0-47-1-71-1v4c-1 11-1 23-2 35l-1 18-1 17v6c0 3 0 6 0 9v2c-1 18-1 18-7 24-5 4-9 8-14 12l-5 4-4 4c-9 7-17 14-26 21-5 4-10 9-15 13l-4 3c-7 5-13 11-20 16-5 4-9 7-13 11-3 3-6 5-10 8-3 2-6 5-9 8-5 4-9 8-14 11-6 5-12 10-18 15-4 3-7 6-11 9-4 4-9 7-13 11-19 16-19 16-27 23-6 5-13 10-19 15-5 4-10 9-15 13-5 4-9 8-14 12-4 3-4 3-6 3l-1 3c-4 14-4 14-7 20-2 1-2 1-5 2l-3 2-3 1-4 2c-10 5-21 9-31 13-7 3-15 6-22 10-18 8-36 15-54 23-3 1-6 2-9 4l-5 2-2 1c-3 1-6 2-10 2-1-1-1-1-2-2v-2c1-6 2-10 5-15l1-2c1-2 2-3 3-5 2-3 3-6 5-9l2-4c3-7 7-14 10-21l1-2c1-3 3-6 4-10 3-7 6-13 10-20l1-3c6-14 13-28 19-42 5-9 9-19 13-28 4-9 8-17 12-26 8-16 15-32 23-48l2-4c2-4 4-9 6-13l2-4 2-4 1-3c1-2 2-3 3-5 1-2 1-2 0-5-1-2-3-4-4-5l-2-2-2-2c-5-5-9-11-13-16-4-5-8-11-13-16l-2-2-2-3c-2-2-2-2-2-4h-1v-2l-2-1c-3-4-6-7-9-11-4-4-7-9-11-13-4-5-8-10-12-15-4-5-8-10-12-14-5-6-10-12-15-18-5-6-10-12-15-17-1-2-3-3-4-5-1-1-1-1-2-3l-2-2c-1-2-1-2-1-4h-1v-2l-2-1c-4-5-8-10-13-15-5-5-9-11-14-17-3-3-6-7-10-10-1-1-2-2-3-3-3-3-6-7-9-10l-1-1-1-2-2-2-1-1v-3l1-2c1-2 1-2 2-3 8 0 15 2 23 5l4 1c4 1 7 2 11 3 4 1 8 2 11 4l3 1c15 5 30 9 46 12l-1-2c-5-9-11-18-17-27-4-7-8-15-13-22-5-9-11-18-16-27l-2-3c-7-12-7-12-7-15 2-5 10-2 14 0z" transform="translate(0,0)"/>
          </svg>
          <span class="logo-text">ChoreGami</span>
        </div>
        <nav class="landing-nav">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <span class="nav-user">{userEmail}</span>
              <a href="/logout" class="nav-link">Log out</a>
            </>
          ) : (
            <>
              <a href="/login" class="nav-link">Log in</a>
              <a href="/register" class="nav-link nav-link-primary">Start Free</a>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section - Emotional, family-focused */}
      <section class="hero">
        <h1 class="hero-title">Stop the Daily Chore Battles</h1>
        <p class="hero-subtitle">
          ChoreGami turns "Did you do it yet?" into automatic routines your kids actually follow — without nagging, without fights.
        </p>
        <div class="hero-cta">
          <a href="/register" class="btn btn-hero-primary">Start Free Trial</a>
        </div>
        <p class="hero-pwa">15 days free · No credit card required</p>
        <p class="hero-trust">Built by parents, for families with kids 6-16</p>
      </section>

      {/* Sound Familiar? - Pain points */}
      <section class="pain-section">
        <h2 class="section-title">Sound Familiar?</h2>
        <div class="pain-cards">
          <div class="pain-card">
            <span class="pain-emoji">😤</span>
            <strong>You're tired of repeating yourself</strong>
            <span>"Take out the trash." "Did you feed the dog?" Same arguments. Every. Single. Day.</span>
          </div>
          <div class="pain-card">
            <span class="pain-emoji">😔</span>
            <strong>Your kids say chores aren't fair</strong>
            <span>"Why do I always have to do dishes?" The complaints never stop — and honestly, you've lost track yourself.</span>
          </div>
          <div class="pain-card">
            <span class="pain-emoji">🎯</span>
            <strong>Nothing else has worked</strong>
            <span>Paper charts fall off the fridge. Apps are too complicated. Sticker systems lose their magic.</span>
          </div>
        </div>
        <p class="pain-transition">What if chores just... happened? Without the drama?</p>
      </section>

      {/* Demo Section */}
      <section class="demo-section" id="demo">
        <div class="demo-container">
          <div class="demo-badge">See It In Action</div>
          <p class="demo-subtitle">Watch chores rotate automatically — no more "that's not fair!"</p>
          <p class="demo-instruction">👉 Tap "Next Week" to see the rotation</p>
          <LandingDemo />
          <div class="points-explanation">
            <strong>Why points work:</strong> Kids love seeing their score go up. Parents love having a clear record of who's doing what. Everyone knows the system is fair — because it is.
          </div>
        </div>
      </section>

      {/* How it works - Family focused */}
      <section class="how-it-works">
        <h2 class="section-title">How It Works</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>Add your kids</strong>
              <span>Set up each child in seconds. Works for families with 1-6 kids.</span>
            </div>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>Create chores once</strong>
              <span>Dishes, trash, pet care, homework — you decide the points and schedule.</span>
            </div>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>Let ChoreGami handle the rest</strong>
              <span>Chores rotate automatically. Kids see what's theirs. You see who's done what.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section class="faq-section">
        <h2 class="section-title">Questions?</h2>
        <div class="faq-list">
          <div class="faq-item">
            <strong>How is this different from a chore chart?</strong>
            <p>ChoreGami rotates chores automatically, tracks points over time, and shows everyone's progress in one place. No markers, no magnets, no "whose turn was it last week?"</p>
          </div>
          <div class="faq-item">
            <strong>Will my kids actually use this?</strong>
            <p>Kids love earning points and watching their streak grow. Parents love not having to track everything manually. It's designed to work for both of you.</p>
          </div>
          <div class="faq-item">
            <strong>Do I need to download an app?</strong>
            <p>Nope. ChoreGami works in any web browser — phones, tablets, computers. Add it to your home screen for quick access, but there's nothing to download.</p>
          </div>
          <div class="faq-item">
            <strong>I have a gift card. How do I use it?</strong>
            <p>Go to <a href="/redeem">choregami.fly.dev/redeem</a>, enter your code, and you're set. You can check if your code is valid before creating an account.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section class="cta-section">
        <h2 class="cta-title">Ready to Stop the Chore Battles?</h2>
        <p class="cta-subtitle">Join families who've turned chore time from chaos into calm.</p>
        <div class="cta-buttons">
          <a href="/register" class="btn btn-cta-primary">Start Free Trial</a>
          <a href="/redeem" class="btn btn-cta-secondary">Have a gift code? Redeem here</a>
        </div>
        <p class="cta-note">15 days free · No credit card · Cancel anytime</p>
      </section>

      {/* Footer */}
      <footer class="landing-footer">
        <p>
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/landing">Other use cases</a>
        </p>
        <p class="footer-copy">© 2026 ChoreGami™ · Built with ❤️ for busy families</p>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
        }

        /* Header */
        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary, #10b981);
        }
        .landing-logo .logo-icon {
          width: 1.75rem;
          height: 1.75rem;
          color: #10b981 !important;
        }
        .landing-nav {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .nav-link {
          padding: 0.5rem 1rem;
          text-decoration: none;
          color: var(--color-text, #064e3b);
          font-weight: 500;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: rgba(16, 185, 129, 0.1);
        }
        .nav-user {
          font-size: 0.875rem;
          color: #6b7280;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-link-primary {
          background: var(--color-primary, #10b981);
          color: white;
        }
        .nav-link-primary:hover {
          background: #059669;
        }

        /* Hero */
        .hero {
          text-align: center;
          padding: 3rem 1.5rem 2rem;
          max-width: 700px;
          margin: 0 auto;
          animation: fadeInUp 0.6s ease-out;
        }
        .hero-title {
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 800;
          color: var(--color-text, #064e3b);
          margin: 0 0 1rem;
          line-height: 1.2;
        }
        .hero-subtitle {
          font-size: 1.125rem;
          color: #4b5563;
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }
        .hero-cta {
          margin-bottom: 1rem;
        }
        .btn-hero-primary {
          display: inline-block;
          background: var(--color-primary, #10b981);
          color: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.125rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-hero-primary:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .hero-pwa {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .hero-trust {
          font-size: 0.8rem;
          color: #10b981;
          margin: 0.5rem 0 0;
          font-weight: 500;
        }

        /* Section titles */
        .section-title {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text, #064e3b);
          margin: 0 0 1.5rem;
        }

        /* Pain section */
        .pain-section {
          padding: 2rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
          animation: fadeInUp 0.6s ease-out 0.1s both;
        }
        .pain-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pain-card {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pain-emoji {
          font-size: 1.5rem;
        }
        .pain-card strong {
          color: var(--color-text, #064e3b);
          font-size: 1rem;
        }
        .pain-card span {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .pain-transition {
          text-align: center;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-primary, #10b981);
          margin: 1.5rem 0 0;
        }

        /* Demo section */
        .demo-section {
          padding: 2rem 1rem;
          background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }
        .demo-container {
          max-width: 520px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          position: relative;
        }
        .demo-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-primary, #10b981);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .demo-subtitle {
          text-align: center;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--color-text, #064e3b);
          margin: 0.5rem 0 0.5rem;
        }
        .demo-instruction {
          text-align: center;
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0 0 1rem;
        }
        .points-explanation {
          margin-top: 1rem;
          padding: 1rem;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #064e3b;
          line-height: 1.5;
        }
        .points-explanation strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #10b981;
        }

        /* How it works */
        .how-it-works {
          padding: 2rem 1.5rem;
          max-width: 700px;
          margin: 0 auto;
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .step {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .step-number {
          width: 32px;
          height: 32px;
          background: var(--color-primary, #10b981);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .step-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .step-content strong {
          color: var(--color-text, #064e3b);
        }
        .step-content span {
          color: #6b7280;
          font-size: 0.9rem;
        }

        /* FAQ Section */
        .faq-section {
          padding: 2rem 1.5rem;
          max-width: 700px;
          margin: 0 auto;
          animation: fadeInUp 0.6s ease-out 0.35s both;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .faq-item {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .faq-item strong {
          color: var(--color-text, #064e3b);
          font-size: 1rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        .faq-item p {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0;
        }
        .faq-item a {
          color: var(--color-primary, #10b981);
        }

        /* CTA section */
        .cta-section {
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, var(--color-primary, #10b981) 0%, #059669 100%);
          color: white;
          animation: fadeInUp 0.6s ease-out 0.4s both;
        }
        .cta-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
        }
        .cta-subtitle {
          font-size: 1rem;
          opacity: 0.9;
          margin: 0 0 1.5rem;
        }
        .cta-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }
        .btn-cta-primary {
          display: inline-block;
          background: white;
          color: #059669;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          font-size: 1.125rem;
          transition: all 0.2s;
        }
        .btn-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .btn-cta-secondary {
          display: inline-block;
          background: transparent;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          font-size: 0.95rem;
          border: 2px solid rgba(255, 255, 255, 0.5);
          transition: all 0.2s;
        }
        .btn-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
        }
        .cta-note {
          margin: 1rem 0 0;
          font-size: 0.875rem;
          opacity: 0.85;
        }

        /* Footer */
        .landing-footer {
          text-align: center;
          padding: 2rem 1.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .landing-footer a {
          color: #6b7280;
          text-decoration: none;
        }
        .landing-footer a:hover {
          color: var(--color-primary, #10b981);
        }
        .footer-copy {
          margin: 0.5rem 0 0;
          font-size: 0.75rem;
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .cta-buttons {
            width: 100%;
          }
          .btn-cta-primary,
          .btn-cta-secondary {
            width: 100%;
            text-align: center;
          }
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .landing-page {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          }
          .landing-logo {
            color: #60a5fa;
          }
          .landing-logo .logo-icon {
            color: #60a5fa !important;
          }
          .nav-link {
            color: #e2e8f0;
          }
          .nav-link:hover {
            background: rgba(96, 165, 250, 0.15);
          }
          .nav-link-primary {
            background: #3b82f6;
          }
          .nav-link-primary:hover {
            background: #2563eb;
          }
          .hero-title {
            color: #f1f5f9;
          }
          .hero-subtitle {
            color: #cbd5e1;
          }
          .hero-trust {
            color: #60a5fa;
          }
          .btn-hero-primary {
            background: #3b82f6;
          }
          .btn-hero-primary:hover {
            background: #2563eb;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .section-title {
            color: #f1f5f9;
          }
          .pain-card,
          .step,
          .faq-item {
            background: #1e3a5f;
          }
          .pain-card strong,
          .step-content strong,
          .faq-item strong {
            color: #f1f5f9;
          }
          .pain-card span,
          .step-content span,
          .faq-item p {
            color: #cbd5e1;
          }
          .pain-transition {
            color: #60a5fa;
          }
          .demo-section {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          }
          .demo-container {
            background: rgba(30, 58, 95, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.2);
          }
          .demo-badge {
            background: #3b82f6;
          }
          .demo-subtitle {
            color: #f1f5f9;
          }
          .demo-instruction {
            color: #94a3b8;
          }
          .points-explanation {
            background: rgba(30, 58, 95, 0.5);
            color: #e2e8f0;
          }
          .points-explanation strong {
            color: #60a5fa;
          }
          .step-number {
            background: #3b82f6;
          }
          .cta-section {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          }
          .btn-cta-primary {
            color: #d97706;
          }
          .faq-item a {
            color: #60a5fa;
          }
          .landing-footer {
            color: #cbd5e1;
          }
          .landing-footer a {
            color: #cbd5e1;
          }
          .landing-footer a:hover {
            color: #93c5fd;
          }
        }
      `}</style>
    </div>
  );
}

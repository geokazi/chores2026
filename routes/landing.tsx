/**
 * Landing Page - Value-first with inline demo
 * 2026 UX Best Practice: Show value in 3-5 seconds, signup after engagement
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import TeaserCards from "../islands/TeaserCards.tsx";
import LandingDemo from "../islands/LandingDemo.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";

export const handler: Handlers = {
  async GET(req, ctx) {
    // If already authenticated, go to main app
    const session = await getAuthenticatedSession(req);
    if (session.isAuthenticated && session.family) {
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    return ctx.render({});
  },
};

export default function LandingPage() {
  return (
    <div class="landing-page">
      {/* Header with subtle auth links */}
      <header class="landing-header">
        <div class="landing-logo">
          <span class="logo-icon">✨</span>
          <span class="logo-text">ChoreGami</span>
        </div>
        <nav class="landing-nav">
          <ThemeToggle />
          <a href="/login" class="nav-link">Log in</a>
          <a href="/register" class="nav-link nav-link-primary">Sign up</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section class="hero">
        <h1 class="hero-title">Household tasks. Sorted.</h1>
        <p class="hero-subtitle">For families, roommates, and you.</p>
        <p class="hero-pwa">No app to download. Works on any device.</p>
      </section>

      {/* Teaser Cards - Who's this for? */}
      <section class="teaser-section">
        <h2 class="section-title">Who's this for?</h2>
        <TeaserCards />
      </section>

      {/* Inline Demo - The Hero */}
      <section class="demo-section">
        <div class="demo-container">
          <div class="demo-badge">Live Demo</div>
          <h2 class="demo-title">See how it works</h2>
          <p class="demo-subtitle">Try completing a chore - no signup needed</p>
          <LandingDemo />
        </div>
      </section>

      {/* How it works */}
      <section class="how-it-works">
        <h2 class="section-title">Simple as 1-2-3</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <span class="step-text">Set up tasks</span>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-text">Assign & rotate</span>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-text">Track & celebrate</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section class="cta-section">
        <h2 class="cta-title">Ready to get started?</h2>
        <p class="cta-subtitle">Free to use. No download. Set up in 2 minutes.</p>
        <div class="cta-buttons">
          <a href="/register" class="btn btn-primary btn-large">Create Free Account</a>
          <a href="/login" class="btn btn-secondary">Sign In</a>
        </div>
      </section>

      {/* Footer */}
      <footer class="landing-footer">
        <p>
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
        </p>
        <p class="footer-copy">© 2026 ChoreGami</p>
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
        .logo-icon {
          font-size: 1.75rem;
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
          max-width: 800px;
          margin: 0 auto;
        }
        .hero-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: var(--color-text, #064e3b);
          margin: 0 0 0.75rem;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: #4b5563;
          margin: 0;
        }
        .hero-pwa {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1rem 0 0;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          font-size: 0.875rem;
          color: #059669;
          font-weight: 500;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        /* Section titles */
        .section-title {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text, #064e3b);
          margin: 0 0 1.5rem;
        }

        /* Teaser section */
        .teaser-section {
          padding: 2rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        /* Demo section */
        .demo-section {
          padding: 2rem 1rem;
          background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
        }
        .demo-container {
          max-width: 500px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
        .demo-title {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem;
          color: var(--color-text, #064e3b);
        }
        .demo-subtitle {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 1rem;
        }

        /* How it works */
        .how-it-works {
          padding: 2rem 1.5rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .steps {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .step-number {
          width: 28px;
          height: 28px;
          background: var(--color-primary, #10b981);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
        }
        .step-text {
          font-weight: 500;
          color: var(--color-text, #064e3b);
        }
        .step-arrow {
          color: #9ca3af;
          font-size: 1.25rem;
        }

        /* CTA section */
        .cta-section {
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white;
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
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          font-size: 1rem;
        }
        .btn-primary {
          background: white;
          color: var(--color-primary, #10b981);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .btn-secondary {
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.5);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
        }
        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.125rem;
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

        /* Mobile adjustments */
        @media (max-width: 480px) {
          .steps {
            flex-direction: column;
          }
          .step-arrow {
            transform: rotate(90deg);
          }
        }

        /* Scroll reveal animations */
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

        .hero {
          animation: fadeInUp 0.6s ease-out;
        }
        .teaser-section {
          animation: fadeInUp 0.6s ease-out 0.1s both;
        }
        .demo-section {
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }
        .how-it-works {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .cta-section {
          animation: fadeInUp 0.6s ease-out 0.4s both;
        }

        /* Dark mode support - Ocean Depth blue */
        @media (prefers-color-scheme: dark) {
          .landing-page {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          }
          .landing-logo {
            color: #60a5fa;
          }
          .nav-link {
            color: #e0e7ff;
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
          .hero-pwa {
            background: rgba(30, 58, 95, 0.7);
            border: 1px solid rgba(96, 165, 250, 0.2);
            color: #93c5fd;
          }
          .section-title {
            color: #f1f5f9;
          }
          .demo-section {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          }
          .demo-container {
            background: rgba(30, 58, 95, 0.7);
            border: 1px solid rgba(96, 165, 250, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }
          .demo-badge {
            background: #3b82f6;
          }
          .demo-title {
            color: #f1f5f9;
          }
          .demo-subtitle {
            color: #94a3b8;
          }
          .step {
            background: #1e3a5f;
          }
          .step-number {
            background: #3b82f6;
          }
          .step-text {
            color: #f1f5f9;
          }
          .cta-section {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          }
          .btn-primary {
            color: #d97706;
          }
          .landing-footer {
            color: #94a3b8;
          }
          .landing-footer a {
            color: #94a3b8;
          }
          .landing-footer a:hover {
            color: #60a5fa;
          }
        }
      `}</style>
    </div>
  );
}

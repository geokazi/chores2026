/**
 * Landing Page v2.1 - Simpler flow, pain-first messaging
 * Flow: Hero → Who's this for? → Demo → How it works → CTA
 * Key: Fewer decision points, clear outcome, no "not a fit" section
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
      {/* Header */}
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

      {/* Hero Section - Clear outcome, single path */}
      <section class="hero">
        <h1 class="hero-title">Household tasks. Sorted.</h1>
        <p class="hero-subtitle">For families, roommates, and you.</p>
        <div class="hero-cta">
          <a href="/register" class="btn btn-hero-primary">Create your household</a>
        </div>
        <p class="hero-pwa">No app to download. Works on any device.</p>
      </section>

      {/* Who's this for - Identity first */}
      <section class="teaser-section">
        <h2 class="section-title">Who's this for?</h2>
        <TeaserCards />
      </section>

      {/* Inline Demo */}
      <section class="demo-section" id="demo">
        <div class="demo-container">
          <div class="demo-badge">Live Demo</div>
          <h2 class="demo-title">See the magic</h2>
          <p class="demo-subtitle">Chores rotate automatically. No more "that's not fair!"</p>
          <LandingDemo />
        </div>
      </section>

      {/* How it works - Outcome-focused */}
      <section class="how-it-works">
        <h2 class="section-title">How it works</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>Add people (or don't)</strong>
              <span>Use it solo or invite others later.</span>
            </div>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>Create responsibilities</strong>
              <span>Chores, routines — anything repeatable.</span>
            </div>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>Let it run</strong>
              <span>Rotation and tracking happen automatically.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section class="cta-section">
        <h2 class="cta-title">Ready to get organized?</h2>
        <p class="cta-subtitle">Setup takes 2 minutes. No credit card required.</p>
        <a href="/register" class="btn btn-cta-primary">Create your household</a>
        <a href="#demo" class="btn btn-cta-secondary">See how it works</a>
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
          max-width: 600px;
          margin: 0 auto;
        }
        .hero-title {
          font-size: clamp(2.5rem, 7vw, 3.5rem);
          font-weight: 800;
          color: var(--color-text, #064e3b);
          margin: 0 0 0.5rem;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: #4b5563;
          margin: 0 0 1.5rem;
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
          max-width: 520px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
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
          max-width: 700px;
          margin: 0 auto;
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

        /* CTA section */
        .cta-section {
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, var(--color-primary, #10b981) 0%, #059669 100%);
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
          margin-right: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .btn-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .btn-cta-secondary {
          display: inline-block;
          background: transparent;
          color: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          font-size: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.5);
          transition: all 0.2s;
        }
        .btn-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
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
          .btn-cta-primary, .btn-cta-secondary {
            display: block;
            width: 100%;
            margin: 0 0 0.75rem 0;
            text-align: center;
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

        /* Dark mode - Ocean Depth blue */
        @media (prefers-color-scheme: dark) {
          .landing-page {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          }
          .landing-logo {
            color: #60a5fa;
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
            color: #e2e8f0;
          }
          .hero-pwa {
            color: #cbd5e1;
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
          .demo-section {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          }
          .demo-container {
            background: rgba(30, 58, 95, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }
          .demo-badge {
            background: #3b82f6;
          }
          .demo-title {
            color: #f1f5f9;
          }
          .demo-subtitle {
            color: #cbd5e1;
          }
          .step {
            background: #1e3a5f;
          }
          .step-number {
            background: #3b82f6;
          }
          .step-content strong {
            color: #ffffff;
          }
          .step-content span {
            color: #f1f5f9;
          }
          .cta-section {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          }
          .btn-cta-primary {
            color: #d97706;
          }
          .btn-cta-secondary {
            color: white;
            border-color: rgba(255, 255, 255, 0.5);
          }
          .btn-cta-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: white;
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

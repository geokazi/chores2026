/**
 * Landing Page - Value-first with inline demo
 * Strategy: Parent-first messaging, quiet automation, low cognitive load
 * Hero: "Chores that run themselves" - benefit over feature
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

      {/* Hero Section - Benefit-driven, not feature-driven */}
      <section class="hero">
        <h1 class="hero-title">Chores that run themselves.</h1>
        <p class="hero-subtitle">
          Automatically assign, rotate, and track shared responsibilities —
          without reminders, spreadsheets, or shared passwords.
        </p>
        <div class="hero-cta">
          <a href="/register" class="btn btn-hero-primary">Get started in 2 minutes</a>
          <a href="#demo" class="btn btn-hero-secondary">Try the live demo</a>
        </div>
        <p class="hero-microcopy">Works for families, roommates, or just you.</p>
      </section>

      {/* Value Proof - Outcomes, not features */}
      <section class="value-section">
        <div class="value-grid">
          <div class="value-item">
            <span class="value-icon">🔕</span>
            <div>
              <strong>No nagging.</strong>
              <span>Tasks rotate automatically, so responsibility stays fair.</span>
            </div>
          </div>
          <div class="value-item">
            <span class="value-icon">🔐</span>
            <div>
              <strong>No shared passwords.</strong>
              <span>Kids and roommates get their own simple access.</span>
            </div>
          </div>
          <div class="value-item">
            <span class="value-icon">📅</span>
            <div>
              <strong>No re-planning.</strong>
              <span>Recurring tasks just show up — done or not.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Teaser Cards - Who's this for? */}
      <section class="teaser-section">
        <h2 class="section-title">Works wherever responsibility is shared</h2>
        <TeaserCards />
      </section>

      {/* Inline Demo */}
      <section class="demo-section" id="demo">
        <div class="demo-container">
          <div class="demo-badge">Live Demo</div>
          <h2 class="demo-title">See it work — no signup required</h2>
          <p class="demo-subtitle">Complete a chore. Watch it update.</p>
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

      {/* Good Fit / Not Fit - Builds trust without fake testimonials */}
      <section class="fit-section">
        <h2 class="section-title">Is ChoreGami right for you?</h2>
        <div class="fit-grid">
          <div class="fit-card fit-yes">
            <h3>👍 A good fit if you want:</h3>
            <ul>
              <li>Less reminding and follow-ups</li>
              <li>Fair rotation of shared tasks</li>
              <li>A system that runs quietly in the background</li>
              <li>Kids or roommates to see only their tasks</li>
            </ul>
          </div>
          <div class="fit-card fit-no">
            <h3>🚫 Not a good fit if you want:</h3>
            <ul>
              <li>A full family calendar or planner</li>
              <li>Highly customized workflows</li>
              <li>A tool you need to constantly manage</li>
              <li>Complex scheduling with dependencies</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section class="cta-section">
        <h2 class="cta-title">Spend less time managing tasks.</h2>
        <p class="cta-subtitle">Let responsibility take care of itself.</p>
        <a href="/register" class="btn btn-cta-primary">Get started — it's free</a>
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
          max-width: 700px;
          margin: 0 auto;
        }
        .hero-title {
          font-size: clamp(2.25rem, 6vw, 3.5rem);
          font-weight: 800;
          color: var(--color-text, #064e3b);
          margin: 0 0 1rem;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-size: 1.125rem;
          color: #4b5563;
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .hero-cta {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .btn-hero-primary {
          background: var(--color-primary, #10b981);
          color: white;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-hero-primary:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .btn-hero-secondary {
          background: transparent;
          color: var(--color-primary, #10b981);
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          border: 2px solid var(--color-primary, #10b981);
          transition: all 0.2s;
        }
        .btn-hero-secondary:hover {
          background: rgba(16, 185, 129, 0.1);
        }
        .hero-microcopy {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        /* Value Section */
        .value-section {
          padding: 2rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .value-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .value-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .value-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .value-item strong {
          color: var(--color-text, #064e3b);
          display: block;
          margin-bottom: 0.25rem;
        }
        .value-item span {
          color: #6b7280;
          font-size: 0.9rem;
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

        /* Fit Section */
        .fit-section {
          padding: 2rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .fit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        .fit-card {
          padding: 1.5rem;
          border-radius: 12px;
        }
        .fit-card h3 {
          font-size: 1rem;
          margin: 0 0 1rem;
          color: var(--color-text, #064e3b);
        }
        .fit-card ul {
          margin: 0;
          padding: 0 0 0 1.25rem;
        }
        .fit-card li {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #4b5563;
        }
        .fit-yes {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .fit-no {
          background: #fef2f2;
          border: 1px solid #fecaca;
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
        .btn-cta-primary {
          display: inline-block;
          background: white;
          color: #1e40af;
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
          .hero-cta {
            flex-direction: column;
          }
          .btn-hero-primary, .btn-hero-secondary {
            width: 100%;
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
        .value-section {
          animation: fadeInUp 0.6s ease-out 0.1s both;
        }
        .teaser-section {
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }
        .demo-section {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .how-it-works {
          animation: fadeInUp 0.6s ease-out 0.4s both;
        }
        .fit-section {
          animation: fadeInUp 0.6s ease-out 0.5s both;
        }
        .cta-section {
          animation: fadeInUp 0.6s ease-out 0.6s both;
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
          .hero-microcopy {
            color: #94a3b8;
          }
          .btn-hero-primary {
            background: #3b82f6;
          }
          .btn-hero-primary:hover {
            background: #2563eb;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .btn-hero-secondary {
            color: #60a5fa;
            border-color: #3b82f6;
          }
          .btn-hero-secondary:hover {
            background: rgba(59, 130, 246, 0.15);
          }
          .value-item {
            background: #1e293b;
          }
          .value-item strong {
            color: #f1f5f9;
          }
          .value-item span {
            color: #94a3b8;
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
            background: #1e293b;
          }
          .step-number {
            background: #3b82f6;
          }
          .step-content strong {
            color: #f1f5f9;
          }
          .step-content span {
            color: #94a3b8;
          }
          .fit-card h3 {
            color: #f1f5f9;
          }
          .fit-card li {
            color: #cbd5e1;
          }
          .fit-yes {
            background: rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.3);
          }
          .fit-no {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
          }
          .cta-section {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          }
          .btn-cta-primary {
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

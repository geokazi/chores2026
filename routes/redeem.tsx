/**
 * Gift Code Redemption Page
 * /redeem or /redeem?code=GIFT-XXXX-XXXX-XXXX
 * ~70 lines - Simple page with RedeemForm island
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import RedeemForm from "../islands/RedeemForm.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface RedeemPageData {
  prefillCode?: string;
  isLoggedIn: boolean;
}

export const handler: Handlers<RedeemPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    const url = new URL(req.url);
    const prefillCode = url.searchParams.get("code") || undefined;

    // Redirect to login if not authenticated
    if (!session.isAuthenticated) {
      const returnUrl = encodeURIComponent(url.pathname + url.search);
      return new Response(null, {
        status: 303,
        headers: { Location: `/login?returnTo=${returnUrl}` },
      });
    }

    return ctx.render({ prefillCode, isLoggedIn: true });
  },
};

export default function RedeemPage({ data }: PageProps<RedeemPageData>) {
  return (
    <div class="redeem-container">
      <div class="redeem-card">
        <RedeemForm prefillCode={data.prefillCode} />
        <AppFooter />
      </div>

      <style>{`
        .redeem-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
          padding: 1rem;
        }
        .redeem-card {
          background: var(--color-card, white);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}

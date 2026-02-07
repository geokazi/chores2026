/**
 * Gift Code Admin Island
 * Interactive admin panel for gift code management
 * ~450 lines
 */

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Props {
  staffEmail: string;
}

interface Stats {
  overview: {
    total_generated: number;
    total_redeemed: number;
    total_pending: number;
    conversion_rate: number;
  };
  revenue: {
    total: number;
    last_30_days: number;
    formatted_total: string;
    formatted_30d: string;
  };
  by_plan_type: Array<{
    plan_type: string;
    display_name: string;
    price: number;
    generated: number;
    redeemed: number;
    pending: number;
    revenue: number;
    formatted_revenue: string;
  }>;
  activity: {
    redeemed_last_7_days: number;
    redeemed_last_30_days: number;
    generated_last_30_days: number;
  };
}

interface GiftCode {
  code: string;
  plan_type: string;
  message: string | null;
  purchased_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  redeemer_email?: string | null;
  expires_at?: string | null;
}

interface ListResponse {
  codes: GiftCode[];
  pagination: { limit: number; offset: number; total: number };
  summary: { pending: number; redeemed: number };
}

const PLAN_OPTIONS = [
  { value: "summer", label: "Summer (3mo) - $29.99" },
  { value: "school_year", label: "Half Year (6mo) - $49.99" },
  { value: "full_year", label: "Full Year (12mo) - $79.99" },
];

export default function GiftCodeAdmin({ staffEmail }: Props) {
  const stats = useSignal<Stats | null>(null);
  const codes = useSignal<GiftCode[]>([]);
  const listSummary = useSignal<{ pending: number; redeemed: number } | null>(null);
  const activeTab = useSignal<"pending" | "redeemed">("pending");
  const loading = useSignal(true);
  const generating = useSignal(false);

  // Generate form state
  const genPlanType = useSignal("school_year");
  const genQuantity = useSignal(10);
  const genMessage = useSignal("");
  const genResult = useSignal<{ codes: string[]; errors?: string[] } | null>(null);

  // Load stats and codes on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload codes when tab changes
  useEffect(() => {
    loadCodes();
  }, [activeTab.value]);

  async function loadData() {
    loading.value = true;
    await Promise.all([loadStats(), loadCodes()]);
    loading.value = false;
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/gift-codes/stats", { credentials: "include" });
      if (res.ok) {
        stats.value = await res.json();
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  async function loadCodes() {
    try {
      const status = activeTab.value === "pending" ? "pending" : "redeemed";
      const res = await fetch(`/api/admin/gift-codes/list?status=${status}&limit=50`, {
        credentials: "include",
      });
      if (res.ok) {
        const data: ListResponse = await res.json();
        codes.value = data.codes;
        listSummary.value = data.summary;
      }
    } catch (err) {
      console.error("Failed to load codes:", err);
    }
  }

  async function handleGenerate(e: Event) {
    e.preventDefault();
    if (generating.value) return;

    generating.value = true;
    genResult.value = null;

    try {
      const res = await fetch("/api/admin/gift-codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan_type: genPlanType.value,
          quantity: genQuantity.value,
          message: genMessage.value || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.codes) {
        genResult.value = { codes: data.codes, errors: data.errors };
        // Reload data to reflect new codes
        await loadData();
      } else {
        genResult.value = { codes: [], errors: [data.error || "Generation failed"] };
      }
    } catch (err) {
      genResult.value = { codes: [], errors: ["Network error"] };
    } finally {
      generating.value = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading.value && !stats.value) {
    return (
      <div class="loading-container">
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div class="gift-code-admin">
      <h1>Gift Code Admin</h1>

      {/* Stats Overview */}
      {stats.value && (
        <section class="stats-section">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{stats.value.overview.total_generated}</div>
              <div class="stat-label">Total Generated</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{stats.value.overview.total_redeemed}</div>
              <div class="stat-label">Redeemed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{stats.value.overview.total_pending}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{stats.value.overview.conversion_rate}%</div>
              <div class="stat-label">Conversion</div>
            </div>
          </div>

          {/* Revenue Cards */}
          <div class="revenue-grid">
            <div class="revenue-card">
              <div class="revenue-value">{stats.value.revenue.formatted_total}</div>
              <div class="revenue-label">Total Revenue</div>
            </div>
            <div class="revenue-card">
              <div class="revenue-value">{stats.value.revenue.formatted_30d}</div>
              <div class="revenue-label">Last 30 Days</div>
            </div>
            <div class="revenue-card">
              <div class="revenue-value">{stats.value.activity.redeemed_last_7_days}</div>
              <div class="revenue-label">Redeemed (7d)</div>
            </div>
          </div>

          {/* By Plan Type */}
          <div class="plan-breakdown">
            <h3>By Plan Type</h3>
            <table class="plan-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Generated</th>
                  <th>Redeemed</th>
                  <th>Pending</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.value.by_plan_type.map((plan) => (
                  <tr key={plan.plan_type}>
                    <td>{plan.display_name}</td>
                    <td>${plan.price}</td>
                    <td>{plan.generated}</td>
                    <td>{plan.redeemed}</td>
                    <td>{plan.pending}</td>
                    <td>{plan.formatted_revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Generate Codes Form */}
      <section class="generate-section">
        <h2>Generate New Codes</h2>
        <form onSubmit={handleGenerate} class="generate-form">
          <div class="form-row">
            <div class="form-group">
              <label>Plan Type</label>
              <select
                value={genPlanType.value}
                onChange={(e) => (genPlanType.value = (e.target as HTMLSelectElement).value)}
              >
                {PLAN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div class="form-group">
              <label>Quantity (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={genQuantity.value}
                onInput={(e) => (genQuantity.value = parseInt((e.target as HTMLInputElement).value) || 1)}
              />
            </div>
          </div>
          <div class="form-group">
            <label>Message (optional)</label>
            <input
              type="text"
              placeholder="e.g., 'Welcome to ChoreGami!'"
              value={genMessage.value}
              onInput={(e) => (genMessage.value = (e.target as HTMLInputElement).value)}
            />
          </div>
          <button type="submit" class="btn-generate" disabled={generating.value}>
            {generating.value ? "Generating..." : `Generate ${genQuantity.value} Codes`}
          </button>
        </form>

        {/* Generation Result */}
        {genResult.value && (
          <div class={`gen-result ${genResult.value.codes.length > 0 ? "success" : "error"}`}>
            {genResult.value.codes.length > 0 ? (
              <>
                <div class="result-header">
                  <span>Generated {genResult.value.codes.length} codes</span>
                  <button
                    type="button"
                    class="btn-copy-all"
                    onClick={() => copyToClipboard(genResult.value!.codes.join("\n"))}
                  >
                    Copy All
                  </button>
                </div>
                <div class="codes-list">
                  {genResult.value.codes.map((code) => (
                    <div key={code} class="code-item">
                      <code>{code}</code>
                      <button type="button" onClick={() => copyToClipboard(code)}>Copy</button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div class="error-message">
                {genResult.value.errors?.join(", ") || "Generation failed"}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Codes List */}
      <section class="codes-section">
        <div class="tabs">
          <button
            type="button"
            class={`tab ${activeTab.value === "pending" ? "active" : ""}`}
            onClick={() => (activeTab.value = "pending")}
          >
            Pending ({listSummary.value?.pending || 0})
          </button>
          <button
            type="button"
            class={`tab ${activeTab.value === "redeemed" ? "active" : ""}`}
            onClick={() => (activeTab.value = "redeemed")}
          >
            Redeemed ({listSummary.value?.redeemed || 0})
          </button>
        </div>

        <div class="codes-table-container">
          <table class="codes-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Plan</th>
                <th>Created</th>
                {activeTab.value === "redeemed" && <th>Redeemed</th>}
                {activeTab.value === "redeemed" && <th>Assigned To</th>}
                {activeTab.value === "redeemed" && <th>Expires</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.value.length === 0 ? (
                <tr>
                  <td colSpan={activeTab.value === "redeemed" ? 7 : 4} class="no-data">
                    No {activeTab.value} codes found
                  </td>
                </tr>
              ) : (
                codes.value.map((code) => (
                  <tr key={code.code}>
                    <td>
                      <code class="code-text">{code.code}</code>
                    </td>
                    <td>{code.plan_type}</td>
                    <td>{formatDate(code.purchased_at)}</td>
                    {activeTab.value === "redeemed" && (
                      <td>{code.redeemed_at ? formatDate(code.redeemed_at) : "-"}</td>
                    )}
                    {activeTab.value === "redeemed" && (
                      <td class="email-cell">{code.redeemer_email || "-"}</td>
                    )}
                    {activeTab.value === "redeemed" && (
                      <td>{code.expires_at ? formatDate(code.expires_at) : "-"}</td>
                    )}
                    <td>
                      <button type="button" class="btn-small" onClick={() => copyToClipboard(code.code)}>
                        Copy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .gift-code-admin { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .gift-code-admin h1 { margin: 0 0 1.5rem 0; color: #064e3b; }
        .gift-code-admin h2 { margin: 0 0 1rem 0; color: #064e3b; font-size: 1.25rem; }
        .gift-code-admin h3 { margin: 0 0 0.75rem 0; color: #374151; font-size: 1rem; }

        .loading-container { padding: 3rem; text-align: center; color: #6b7280; }

        /* Stats */
        .stats-section { margin-bottom: 2rem; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .stat-card {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 2rem; font-weight: 700; color: #10b981; }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem; }

        .revenue-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .revenue-card {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 1.25rem;
          border-radius: 12px;
          text-align: center;
          color: white;
        }
        .revenue-value { font-size: 1.5rem; font-weight: 700; }
        .revenue-label { font-size: 0.75rem; opacity: 0.9; margin-top: 0.25rem; }

        .plan-breakdown { background: white; padding: 1.25rem; border-radius: 12px; }
        .plan-table { width: 100%; border-collapse: collapse; }
        .plan-table th, .plan-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .plan-table th { font-weight: 600; color: #374151; font-size: 0.875rem; }
        .plan-table td { font-size: 0.875rem; }

        /* Generate Section */
        .generate-section {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .generate-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-row { display: flex; gap: 1rem; }
        .form-group { flex: 1; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #374151; }
        .form-group select, .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .form-group select:focus, .form-group input:focus { outline: none; border-color: #10b981; }
        .btn-generate {
          background: #10b981;
          color: white;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-generate:hover:not(:disabled) { background: #059669; }
        .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }

        .gen-result { margin-top: 1rem; padding: 1rem; border-radius: 8px; }
        .gen-result.success { background: #f0fdf4; border: 1px solid #86efac; }
        .gen-result.error { background: #fef2f2; border: 1px solid #fecaca; }
        .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .btn-copy-all {
          background: #10b981;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .codes-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
        .code-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: white; border-radius: 4px; }
        .code-item code { font-family: monospace; font-size: 0.875rem; }
        .code-item button { padding: 0.25rem 0.5rem; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
        .error-message { color: #dc2626; }

        /* Codes Section */
        .codes-section { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
        .tab {
          flex: 1;
          padding: 1rem;
          background: transparent;
          border: none;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          color: #6b7280;
        }
        .tab:hover { background: #f9fafb; }
        .tab.active { color: #10b981; border-bottom: 2px solid #10b981; margin-bottom: -1px; }

        .codes-table-container { overflow-x: auto; }
        .codes-table { width: 100%; border-collapse: collapse; }
        .codes-table th, .codes-table td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .codes-table th { font-weight: 600; color: #374151; font-size: 0.75rem; text-transform: uppercase; background: #f9fafb; }
        .codes-table td { font-size: 0.875rem; }
        .code-text { font-family: monospace; font-size: 0.8rem; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; }
        .no-data { text-align: center; color: #9ca3af; padding: 2rem !important; }
        .btn-small { padding: 0.375rem 0.75rem; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
        .btn-small:hover { background: #d1d5db; }
        .email-cell { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .revenue-grid { grid-template-columns: 1fr; }
          .form-row { flex-direction: column; }
          .plan-table { font-size: 0.75rem; }
          .plan-table th, .plan-table td { padding: 0.5rem; }
        }
      `}</style>
    </div>
  );
}

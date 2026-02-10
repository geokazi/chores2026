/**
 * Demand Signals Admin Dashboard
 * Staff-only: View aggregated demand signal metrics
 * ~250 lines
 */

import { useEffect, useState } from "preact/hooks";

interface UsageMetric {
  metric: string;
  total_users: number;
  total_events: number;
  last_7_days: number;
  last_30_days: number;
}

interface SignalData {
  feature: string;
  total: number;
  last7: number;
  last30: number;
}

interface DemandData {
  overview: {
    families_with_usage: number;
    profiles_with_usage: number;
  };
  usage_metrics: UsageMetric[];
  demand_signals: SignalData[];
  feature_demand: SignalData[];
  last_updated: string;
}

const METRIC_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  ics: { label: "Calendar Export", description: "Events exported to .ics", icon: "📅" },
  badges: { label: "Badge Taps", description: "In-app badge interactions", icon: "🏅" },
  digests: { label: "Email Digests", description: "Weekly digest emails sent", icon: "📧" },
  prep_shop: { label: "Shopping Tasks Created", description: "Prep tasks marked as shopping", icon: "🛒" },
  prep_export: { label: "Shopping Export", description: "Shopping lists copied to clipboard", icon: "📋" },
};

export default function DemandSignalsAdmin() {
  const [data, setData] = useState<DemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/demand-signals", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch demand signals");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p style={{ color: "#64748b" }}>Loading demand signals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>❌</div>
        <p>{error}</p>
        <button onClick={fetchData} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#10b981" }}>
            {data.overview.families_with_usage}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>Families with Usage</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#3b82f6" }}>
            {data.overview.profiles_with_usage}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>Profiles with Usage</div>
        </div>
      </div>

      {/* Usage Metrics */}
      <section>
        <h2 style={sectionHeaderStyle}>📊 Feature Usage (from usage-tracker)</h2>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
          Tracked via <code>incrementUsage()</code> - stored in profile preferences
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Users</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Events</th>
              </tr>
            </thead>
            <tbody>
              {data.usage_metrics.map((metric) => {
                const info = METRIC_LABELS[metric.metric] || {
                  label: metric.metric,
                  description: "Unknown metric",
                  icon: "📈"
                };
                return (
                  <tr key={metric.metric}>
                    <td style={tdStyle}>
                      <span style={{ marginRight: "0.5rem" }}>{info.icon}</span>
                      <strong>{info.label}</strong>
                    </td>
                    <td style={{ ...tdStyle, color: "#64748b" }}>{info.description}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>
                      {metric.total_users}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#10b981" }}>
                      {metric.total_events}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demand Signals */}
      {data.demand_signals.length > 0 && (
        <section>
          <h2 style={sectionHeaderStyle}>🎯 Landing Page Signals (demand_signals table)</h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
            Assessment quiz completions and landing page interactions
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Feature</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Last 7 Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Last 30 Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>All Time</th>
                </tr>
              </thead>
              <tbody>
                {data.demand_signals.map((signal) => (
                  <tr key={signal.feature}>
                    <td style={tdStyle}><strong>{signal.feature}</strong></td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{signal.last7}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{signal.last30}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#3b82f6" }}>
                      {signal.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Feature Demand Clicks */}
      {data.feature_demand.length > 0 && (
        <section>
          <h2 style={sectionHeaderStyle}>🖱️ Feature Demand Clicks (family_activity)</h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
            In-app clicks on unavailable features (e.g., SMS invite button)
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Feature</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Last 7 Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Last 30 Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>All Time</th>
                </tr>
              </thead>
              <tbody>
                {data.feature_demand.map((demand) => (
                  <tr key={demand.feature}>
                    <td style={tdStyle}><strong>{demand.feature}</strong></td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{demand.last7}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{demand.last30}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#f59e0b" }}>
                      {demand.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Decision Thresholds */}
      <section style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#475569" }}>📏 Decision Thresholds</h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
          <li><strong>prep_export &gt; 15%</strong> of events with prep tasks → Build aggregated /parent/shopping view</li>
          <li><strong>prep_export &lt; 5%</strong> → Current clipboard export is sufficient</li>
          <li><strong>sms_invite</strong> clicks → Validates demand for SMS when 10DLC approved</li>
        </ul>
      </section>

      {/* Last Updated */}
      <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
        Last updated: {new Date(data.last_updated).toLocaleString()}
        <button
          onClick={fetchData}
          style={{
            marginLeft: "1rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

// Styles
const cardStyle: Record<string, string | number> = {
  background: "white",
  padding: "1.25rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  textAlign: "center",
};

const sectionHeaderStyle: Record<string, string | number> = {
  margin: "0 0 0.5rem",
  fontSize: "1.125rem",
  color: "#1e293b",
};

const tableStyle: Record<string, string | number> = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
};

const thStyle: Record<string, string | number> = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "0.75rem",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: Record<string, string | number> = {
  padding: "0.75rem 1rem",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "0.875rem",
};

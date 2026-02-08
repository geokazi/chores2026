/**
 * Shopify SKU Admin Island
 * Interactive UI for managing Shopify SKU to plan mappings
 * ~300 lines
 */

import { useEffect, useState } from "preact/hooks";

interface SKUMapping {
  id: string;
  sku: string;
  plan_type: string;
  duration_months: number;
  product_name: string;
  price_cents: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  staffEmail: string;
}

export default function ShopifySKUAdmin({ staffEmail }: Props) {
  const [mappings, setMappings] = useState<SKUMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    plan_type: "summer",
    duration_months: 3,
    product_name: "",
    price_cents: "",
    description: "",
  });

  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/admin/sku-mappings/list", { credentials: "include" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMappings(data.mappings || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleAdd = async (e: Event) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/admin/sku-mappings/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          price_cents: formData.price_cents ? parseInt(formData.price_cents) : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setShowAddForm(false);
      setFormData({
        sku: "",
        plan_type: "summer",
        duration_months: 3,
        product_name: "",
        price_cents: "",
        description: "",
      });
      fetchMappings();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggleActive = async (mapping: SKUMapping) => {
    try {
      const res = await fetch("/api/admin/sku-mappings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: mapping.id, is_active: !mapping.is_active }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchMappings();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (mapping: SKUMapping) => {
    if (!confirm(`Delete SKU mapping "${mapping.sku}"? This cannot be undone.`)) return;

    try {
      const res = await fetch("/api/admin/sku-mappings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: mapping.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchMappings();
    } catch (err) {
      setError(String(err));
    }
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div class="sku-admin">
      <div class="header-row">
        <h1>Shopify SKU Mappings</h1>
        <button class="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "+ Add SKU"}
        </button>
      </div>

      <p class="description">
        Map Shopify product SKUs to ChoreGami plan types. Changes take effect immediately.
      </p>

      {error && <div class="error-banner">{error}</div>}

      {showAddForm && (
        <form class="add-form" onSubmit={handleAdd}>
          <h3>Add New SKU Mapping</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>SKU *</label>
              <input
                type="text"
                placeholder="CG-1M-TRIAL"
                value={formData.sku}
                onInput={(e) => setFormData({ ...formData, sku: (e.target as HTMLInputElement).value })}
                required
              />
            </div>
            <div class="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="Family Reset Challenge (30 Days)"
                value={formData.product_name}
                onInput={(e) => setFormData({ ...formData, product_name: (e.target as HTMLInputElement).value })}
                required
              />
            </div>
            <div class="form-group">
              <label>Plan Type *</label>
              <select
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: (e.target as HTMLSelectElement).value })}
              >
                <option value="trial">Trial</option>
                <option value="summer">Summer</option>
                <option value="school_year">School Year</option>
                <option value="full_year">Full Year</option>
              </select>
            </div>
            <div class="form-group">
              <label>Duration (months) *</label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.duration_months}
                onInput={(e) => setFormData({ ...formData, duration_months: parseInt((e.target as HTMLInputElement).value) || 1 })}
                required
              />
            </div>
            <div class="form-group">
              <label>Price (cents)</label>
              <input
                type="number"
                placeholder="499 for $4.99"
                value={formData.price_cents}
                onInput={(e) => setFormData({ ...formData, price_cents: (e.target as HTMLInputElement).value })}
              />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="Optional notes"
                value={formData.description}
                onInput={(e) => setFormData({ ...formData, description: (e.target as HTMLInputElement).value })}
              />
            </div>
          </div>
          <button type="submit" class="btn-primary">Add Mapping</button>
        </form>
      )}

      {loading ? (
        <div class="loading">Loading...</div>
      ) : (
        <table class="sku-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Plan Type</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id} class={m.is_active ? "" : "inactive"}>
                <td><code>{m.sku}</code></td>
                <td>{m.product_name}</td>
                <td>{m.plan_type}</td>
                <td>{m.duration_months} mo</td>
                <td>{formatPrice(m.price_cents)}</td>
                <td>
                  <span class={`status-badge ${m.is_active ? "active" : "inactive"}`}>
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn-small" onClick={() => handleToggleActive(m)}>
                    {m.is_active ? "Disable" : "Enable"}
                  </button>
                  <button class="btn-small btn-danger" onClick={() => handleDelete(m)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={7} class="empty">No SKU mappings configured</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <style>{`
        .sku-admin {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        h1 { margin: 0; font-size: 1.5rem; color: #1f2937; }
        .description { color: #6b7280; margin-bottom: 1.5rem; }
        .error-banner {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .add-form {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .add-form h3 { margin: 0 0 1rem 0; font-size: 1.125rem; }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
        .form-group input, .form-group select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        .btn-primary {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-primary:hover { background: #059669; }
        .btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-small:hover { background: #f3f4f6; }
        .btn-danger { color: #dc2626; border-color: #fecaca; }
        .btn-danger:hover { background: #fef2f2; }
        .sku-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sku-table th, .sku-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .sku-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
        }
        .sku-table code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .sku-table tr.inactive { opacity: 0.5; }
        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .status-badge.active { background: #d1fae5; color: #059669; }
        .status-badge.inactive { background: #f3f4f6; color: #6b7280; }
        .actions { display: flex; gap: 0.5rem; }
        .empty { text-align: center; color: #9ca3af; padding: 2rem !important; }
        .loading { text-align: center; padding: 2rem; color: #6b7280; }
        @media (max-width: 768px) {
          .sku-table { display: block; overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

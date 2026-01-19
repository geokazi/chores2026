/**
 * FamilyMembersSection - Manage family members (add/edit/remove kids)
 */

import { useState } from "preact/hooks";

interface FamilyMembersSectionProps {
  members: Array<{
    id: string;
    name: string;
    role: string;
    current_points: number;
  }>;
}

export default function FamilyMembersSection({ members }: FamilyMembersSectionProps) {
  const [showKidModal, setShowKidModal] = useState(false);
  const [editingKid, setEditingKid] = useState<any>(null);
  const [kidNameInput, setKidNameInput] = useState("");
  const [isManagingKid, setIsManagingKid] = useState(false);
  const [pendingRemoveKid, setPendingRemoveKid] = useState<any>(null);

  const childMembers = members.filter(member => member.role === "child");
  const kidCount = childMembers.length;

  const openAddKidModal = () => {
    setEditingKid(null);
    setKidNameInput("");
    setShowKidModal(true);
  };

  const openEditKidModal = (kid: any) => {
    setEditingKid(kid);
    setKidNameInput(kid.name);
    setShowKidModal(true);
  };

  const handleSaveKid = async () => {
    if (!kidNameInput.trim()) return;
    setIsManagingKid(true);

    try {
      const action = editingKid ? "edit" : "add";
      const response = await fetch("/api/family/manage-kid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          kid_id: editingKid?.id,
          name: kidNameInput.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowKidModal(false);
        globalThis.location.reload();
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
    setIsManagingKid(false);
  };

  const handleRemoveKid = async (kid: any) => {
    // If kid has points, show confirmation
    if (kid.current_points > 0) {
      if (!confirm(`Remove ${kid.name}? They have ${kid.current_points} points that will be archived.`)) {
        return;
      }
    }
    // Set pending and trigger PIN verification
    setPendingRemoveKid(kid);
  };

  const confirmRemoveKid = async () => {
    if (!pendingRemoveKid) return;
    setIsManagingKid(true);

    try {
      const response = await fetch("/api/family/manage-kid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          kid_id: pendingRemoveKid.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPendingRemoveKid(null);
        globalThis.location.reload();
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err}`);
    }
    setIsManagingKid(false);
  };

  return (
    <div class="settings-section">
      <h2>👨‍👩‍👧‍👦 Family Members <span style={{ fontSize: "0.875rem", fontWeight: "normal", color: "var(--color-text-light)" }}>({kidCount}/8 kids)</span></h2>
      <div class="members-list">
        {members.map((member) => (
          <div key={member.id} class="member-item">
            <div class="member-info">
              <span class="member-name">{member.name}</span>
              <span class={`member-role ${member.role}`}>
                {member.role === 'parent' ? '👨‍👩‍👧‍👦 Parent' : '🧒 Kid'}
              </span>
            </div>
            <div class="member-actions-row">
              <span class="points">{member.current_points || 0} points</span>
              {member.role === 'child' && (
                <>
                  <button
                    class="btn-icon"
                    onClick={() => openEditKidModal(member)}
                    title="Edit name"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn-icon btn-icon-danger"
                    onClick={() => handleRemoveKid(member)}
                    title="Remove kid"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {kidCount < 8 && (
        <button
          class="btn btn-outline"
          onClick={openAddKidModal}
          style={{ marginTop: "1rem", width: "100%" }}
        >
          + Add Kid
        </button>
      )}

      {/* Add/Edit Kid Modal */}
      {showKidModal && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>{editingKid ? `✏️ Edit ${editingKid.name}` : '➕ Add Kid'}</h3>
            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Name
              </label>
              <input
                type="text"
                value={kidNameInput}
                onInput={(e) => setKidNameInput((e.target as HTMLInputElement).value)}
                placeholder="Enter kid's name"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "2px solid #e5e7eb",
                  fontSize: "1rem",
                }}
                autoFocus
              />
            </div>
            <div class="modal-actions">
              <button
                onClick={handleSaveKid}
                class="btn btn-primary"
                disabled={!kidNameInput.trim() || isManagingKid}
              >
                {isManagingKid ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowKidModal(false)}
                class="btn btn-secondary"
                disabled={isManagingKid}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Kid PIN Verification Modal */}
      {pendingRemoveKid && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>🔐 Verify Parent PIN</h3>
            <p style={{ marginBottom: "1rem" }}>
              Enter your PIN to remove <strong>{pendingRemoveKid.name}</strong>
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                id="remove-pin-input"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "2px solid #e5e7eb",
                  fontSize: "1.25rem",
                  textAlign: "center",
                  letterSpacing: "0.5rem",
                }}
                autoFocus
                onInput={async (e) => {
                  const pin = (e.target as HTMLInputElement).value;
                  if (pin.length === 4) {
                    // Verify PIN
                    const res = await fetch("/api/parent/verify-pin-simple", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pin }),
                    });
                    const result = await res.json();
                    if (result.success) {
                      confirmRemoveKid();
                    } else {
                      alert("❌ Incorrect PIN");
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
            </div>
            <div class="modal-actions">
              <button
                onClick={() => setPendingRemoveKid(null)}
                class="btn btn-secondary"
                disabled={isManagingKid}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

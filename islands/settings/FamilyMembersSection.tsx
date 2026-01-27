/**
 * FamilyMembersSection - Manage family members (add/edit/remove kids, invite adults)
 */

import { useState } from "preact/hooks";
import ModalHeader from "../../components/ModalHeader.tsx";

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

  // Invite adult state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteChannel, setInviteChannel] = useState<"email" | "phone">("email");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const childMembers = members.filter(member => member.role === "child");
  const parentMembers = members.filter(member => member.role === "parent");
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

  const openInviteModal = () => {
    setInviteChannel("email");
    setInviteContact("");
    setInviteName("");
    setInviteResult(null);
    setShowInviteModal(true);
  };

  const handleSendInvite = async () => {
    if (!inviteContact.trim()) return;
    setIsInviting(true);
    setInviteResult(null);

    try {
      const response = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel: inviteChannel,
          contact: inviteContact.trim(),
          name: inviteName.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setInviteResult({ success: true, message: result.message || result.warning || "Invite sent!" });
        // Clear form after success
        setInviteContact("");
        setInviteName("");
      } else {
        setInviteResult({ success: false, message: result.error || "Failed to send invite" });
      }
    } catch (err) {
      setInviteResult({ success: false, message: "Network error. Please try again." });
    }
    setIsInviting(false);
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
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        {kidCount < 8 && (
          <button
            class="btn btn-outline"
            onClick={openAddKidModal}
            style={{ flex: 1 }}
          >
            + Add Kid
          </button>
        )}
        <button
          class="btn btn-outline"
          onClick={openInviteModal}
          style={{ flex: 1 }}
        >
          + Invite Adult
        </button>
      </div>

      {/* Add/Edit Kid Modal */}
      {showKidModal && (
        <div class="modal-overlay">
          <div class="modal">
            <ModalHeader
              title={editingKid ? `✏️ Edit ${editingKid.name}` : '➕ Add Kid'}
              onBack={() => setShowKidModal(false)}
              onSubmit={handleSaveKid}
              submitLabel={isManagingKid ? 'Saving...' : 'Save'}
              backLabel="Cancel"
              isSubmitting={isManagingKid}
              submitDisabled={!kidNameInput.trim()}
            />
            <div>
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

      {/* Invite Adult Modal */}
      {showInviteModal && (
        <div class="modal-overlay">
          <div class="modal">
            <ModalHeader
              title="📧 Invite Adult"
              onBack={() => setShowInviteModal(false)}
              onSubmit={handleSendInvite}
              submitLabel={isInviting ? "Sending..." : "Send Invite"}
              backLabel="Cancel"
              isSubmitting={isInviting}
              submitDisabled={!inviteContact.trim()}
            />

            {inviteResult && (
              <div style={{
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                background: inviteResult.success ? "#f0fdf4" : "#fef2f2",
                color: inviteResult.success ? "#10b981" : "#dc2626",
              }}>
                {inviteResult.message}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                How should we reach them?
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => { setInviteChannel("email"); setInviteContact(""); }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: `2px solid ${inviteChannel === "email" ? "#10b981" : "#e5e7eb"}`,
                    background: inviteChannel === "email" ? "#f0fdf4" : "white",
                    cursor: "pointer",
                    fontWeight: inviteChannel === "email" ? "600" : "400",
                  }}
                >
                  📧 Email
                </button>
                <button
                  type="button"
                  onClick={() => { setInviteChannel("phone"); setInviteContact(""); }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: `2px solid ${inviteChannel === "phone" ? "#10b981" : "#e5e7eb"}`,
                    background: inviteChannel === "phone" ? "#f0fdf4" : "white",
                    cursor: "pointer",
                    fontWeight: inviteChannel === "phone" ? "600" : "400",
                  }}
                >
                  📱 Phone
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                {inviteChannel === "email" ? "Email Address" : "Phone Number"}
              </label>
              <input
                type={inviteChannel === "email" ? "email" : "tel"}
                value={inviteContact}
                onInput={(e) => setInviteContact((e.target as HTMLInputElement).value)}
                placeholder={inviteChannel === "email" ? "spouse@example.com" : "(555) 123-4567"}
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

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Their Name <span style={{ color: "#888", fontWeight: "400" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={inviteName}
                onInput={(e) => setInviteName((e.target as HTMLInputElement).value)}
                placeholder="Alex"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "2px solid #e5e7eb",
                  fontSize: "1rem",
                }}
              />
            </div>

            <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "1rem" }}>
              They'll receive a link to join your family. The invite expires in 7 days.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

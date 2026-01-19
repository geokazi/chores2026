/**
 * PointManagementSection - Adjust family member points
 */

import { useState } from "preact/hooks";

interface PointManagementSectionProps {
  members: Array<{
    id: string;
    name: string;
    role: string;
    current_points: number;
  }>;
  familyId: string;
}

export default function PointManagementSection({ members, familyId }: PointManagementSectionProps) {
  const [showPointAdjustment, setShowPointAdjustment] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const handleMemberPointAdjustment = (member: any) => {
    setSelectedMember(member);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setShowPointAdjustment(true);
  };

  const handlePointAdjustment = async () => {
    if (!selectedMember || !adjustmentAmount || !adjustmentReason) {
      return;
    }

    const beforePoints = selectedMember.current_points;
    const adjustAmount = parseInt(adjustmentAmount);

    try {
      const response = await fetch(`/api/points/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMember.id,
          family_id: familyId,
          amount: adjustAmount,
          reason: adjustmentReason,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const afterPoints = result.new_balance;
        const sign = adjustAmount >= 0 ? "+" : "";

        alert(`✅ Points adjusted for ${selectedMember.name}!\n\nBefore: ${beforePoints} pts\nAdjustment: ${sign}${adjustAmount} pts\nAfter: ${afterPoints} pts\n\nReason: ${adjustmentReason}`);

        console.log("✅ Points adjusted successfully:", {
          member: selectedMember.name,
          before: beforePoints,
          adjustment: adjustAmount,
          after: afterPoints,
        });

        setShowPointAdjustment(false);
        setSelectedMember(null);
        setAdjustmentAmount("");
        setAdjustmentReason("");
        window.location.reload();
      } else {
        const errorMsg = result.details || result.error || "Unknown error";
        alert(`❌ Failed to adjust points: ${errorMsg}`);
        console.error("❌ Failed to adjust points:", result);
      }
    } catch (error) {
      alert(`❌ Error adjusting points: ${error}`);
      console.error("❌ Error adjusting points:", error);
    }
  };

  const closeModal = () => {
    setShowPointAdjustment(false);
    setSelectedMember(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
  };

  return (
    <div class="settings-section">
      <h2>⚡ Point Management</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
        Adjust family member points with quick presets or custom amounts
      </p>

      <div class="point-management">
        {members.map((member) => (
          <div key={member.id} class="member-item">
            <div class="member-info">
              <span class="member-name">{member.name}</span>
              <span class={`member-role ${member.role}`}>
                {member.role === 'parent' ? '👨‍👩‍👧‍👦 Parent' : '🧒 Kid'}
              </span>
              <span class="member-points">{member.current_points} points</span>
            </div>
            <div class="member-actions">
              <button
                class="btn btn-outline"
                onClick={() => handleMemberPointAdjustment(member)}
                style={{ fontSize: "0.75rem" }}
              >
                ⚡ Adjust Points
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Point Adjustment Modal */}
      {showPointAdjustment && selectedMember && (
        <div class="modal-overlay">
          <div class="modal">
            <h3>⚡ Adjust Points for {selectedMember.name}</h3>
            <p>Current points: {selectedMember.current_points}</p>

            <div class="adjustment-form">
              <div class="preset-buttons">
                <button
                  onClick={() => {
                    setAdjustmentAmount("5");
                    setAdjustmentReason("Good job!");
                  }}
                  class="preset-btn good"
                >
                  +5 Good
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("10");
                    setAdjustmentReason("Extra effort!");
                  }}
                  class="preset-btn extra"
                >
                  +10 Extra
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("-2");
                    setAdjustmentReason("Partial completion");
                  }}
                  class="preset-btn half"
                >
                  -2 Half
                </button>
                <button
                  onClick={() => {
                    setAdjustmentAmount("-5");
                    setAdjustmentReason("Remove points");
                  }}
                  class="preset-btn remove"
                >
                  -5 Remove
                </button>
              </div>

              <div class="custom-adjustment">
                <label>Custom Amount:</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount((e.target as HTMLInputElement).value)}
                  placeholder="Enter amount"
                />

                <label>Reason:</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason((e.target as HTMLInputElement).value)}
                  placeholder="Why are you adjusting points?"
                />
              </div>
            </div>

            <div class="modal-actions">
              <button
                onClick={handlePointAdjustment}
                class="btn btn-primary"
                disabled={!adjustmentAmount || !adjustmentReason}
              >
                Apply Adjustment
              </button>
              <button
                onClick={closeModal}
                class="btn btn-secondary"
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

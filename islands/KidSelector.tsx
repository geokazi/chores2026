/**
 * Kid Selector Island
 * Allows parent to select which kid is using the app
 * Handles PIN entry if enabled for the family
 */

import { useState } from "preact/hooks";
import PinEntryModal from "./PinEntryModal.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
  pin_hash?: string;
}

interface Family {
  id: string;
  children_pins_enabled: boolean;
}

interface Props {
  family: Family;
  familyMembers: FamilyMember[];
}

export default function KidSelector({ family, familyMembers }: Props) {
  const [selectedKid, setSelectedKid] = useState<FamilyMember | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);

  // Show all family members (both parents and children)
  const allMembers = familyMembers;

  const handleMemberSelect = (member: FamilyMember) => {
    if (member.role === "parent") {
      // Parents go to parent dashboard
      window.location.href = `/parent/dashboard`;
    } else if (family.children_pins_enabled && member.role === "child") {
      // Children with PIN enabled go through PIN entry
      setSelectedKid(member);
      setShowPinEntry(true);
    } else {
      // Children without PIN go directly to kid dashboard
      window.location.href = `/kid/${member.id}/dashboard`;
    }
  };

  const handlePinSuccess = () => {
    if (selectedKid) {
      window.location.href = `/kid/${selectedKid.id}/dashboard`;
    }
  };

  const handlePinCancel = () => {
    setSelectedKid(null);
    setShowPinEntry(false);
  };

  const calculateStreakEmoji = (points: number) => {
    if (points > 800) return "🔥5";
    if (points > 600) return "🔥4";
    if (points > 400) return "🔥3";
    if (points > 200) return "🔥2";
    if (points > 100) return "🔥1";
    return "";
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "👶";
  };

  // Sort all members by points for ranking
  const sortedMembers = [...allMembers].sort((a, b) =>
    b.current_points - a.current_points
  );

  return (
    <>
      <div>
        {sortedMembers.map((member, index) => (
          <div
            key={member.id}
            class="card chore-card"
            onClick={() => handleMemberSelect(member)}
            style={{
              cursor: "pointer",
              marginBottom: "1rem",
              textAlign: "center",
              padding: "2rem 1.5rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
              {member.role === "parent" ? "👨‍💼" : getRankEmoji(index)}
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              {member.name}
              {member.role === "parent" && (
                <span style={{ fontSize: "0.875rem", marginLeft: "0.5rem", color: "var(--color-text-light)" }}>
                  (Parent)
                </span>
              )}
            </div>
            <div
              style={{
                color: "var(--color-primary)",
                fontWeight: "600",
                fontSize: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              {member.current_points} pts{" "}
              {calculateStreakEmoji(member.current_points)}
            </div>

            {family.children_pins_enabled && member.role === "child" && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-light)",
                  marginTop: "0.5rem",
                }}
              >
                [ Tap to Enter PIN ]
              </div>
            )}

            {(!family.children_pins_enabled && member.role === "child") || member.role === "parent" && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-success)",
                  marginTop: "0.5rem",
                }}
              >
                {member.role === "parent" ? "Tap for Parent View →" : "Tap to enter →"}
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedMembers.length === 0 && (
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-light)" }}>
            No family members found.
          </p>
          <a
            href="/parent/settings"
            class="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Add Family Members
          </a>
        </div>
      )}

      {showPinEntry && selectedKid && (
        <PinEntryModal
          kid={selectedKid}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
    </>
  );
}

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

  const kids = familyMembers.filter((member) => member.role === "child");

  const handleKidSelect = (kid: FamilyMember) => {
    if (family.children_pins_enabled && kid.role === "child") {
      setSelectedKid(kid);
      setShowPinEntry(true);
    } else {
      // Direct access - redirect to kid dashboard
      window.location.href = `/kid/${kid.id}/dashboard`;
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

  // Sort kids by points for ranking
  const sortedKids = [...kids].sort((a, b) =>
    b.current_points - a.current_points
  );

  return (
    <>
      <div>
        {sortedKids.map((kid, index) => (
          <div
            key={kid.id}
            class="card chore-card"
            onClick={() => handleKidSelect(kid)}
            style={{
              cursor: "pointer",
              marginBottom: "1rem",
              textAlign: "center",
              padding: "2rem 1.5rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
              {getRankEmoji(index)}
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              {kid.name}
            </div>
            <div
              style={{
                color: "var(--color-primary)",
                fontWeight: "600",
                fontSize: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              {kid.current_points} pts{" "}
              {calculateStreakEmoji(kid.current_points)}
            </div>

            {family.children_pins_enabled && (
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

            {!family.children_pins_enabled && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-success)",
                  marginTop: "0.5rem",
                }}
              >
                Tap to enter →
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedKids.length === 0 && (
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-light)" }}>
            No kids found in this family.
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

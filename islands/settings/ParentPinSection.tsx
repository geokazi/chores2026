/**
 * ParentPinSection - Parent PIN security setup
 */

interface ParentPinSectionProps {
  members: Array<{
    id: string;
    name: string;
    role: string;
    has_pin?: boolean;
  }>;
  onSetPin: (member: { id: string; name: string; role: string }) => void;
}

export default function ParentPinSection({ members, onSetPin }: ParentPinSectionProps) {
  const parentMembers = members.filter(member => member.role === 'parent');

  return (
    <div class="settings-section">
      <h2>🔐 Parent PIN Security</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
        Set a 4-digit PIN to protect point adjustments and family settings
      </p>

      {parentMembers.map((parent) => (
        <div key={parent.id} class="member-item">
          <div class="member-info">
            <span class="member-name">{parent.name}</span>
            <span class="member-role parent">👨‍👩‍👧‍👦 Parent</span>
          </div>
          <div class="member-actions">
            <button
              class="btn btn-outline"
              onClick={() => onSetPin({ id: parent.id, name: parent.name, role: 'parent' })}
              style={{ fontSize: "0.75rem" }}
            >
              {parent.has_pin ? "Change PIN" : "Set PIN"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

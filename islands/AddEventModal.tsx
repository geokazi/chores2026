/**
 * Add/Edit Event Modal Component
 * Simplified event form for ChoreGami (no multi-day, recurrence, or location)
 */

import { useState, useEffect } from "preact/hooks";

// Helper to get local date as YYYY-MM-DD
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
}

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    all_day?: boolean;
    start_time?: string;
  };
  participants?: string[];
  metadata?: {
    emoji?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: FamilyMember[];
  onSuccess?: () => void;
  editingEvent?: FamilyEvent | null;
  creatorId?: string; // Kid profile ID when kid creates event (for attribution)
}

export default function AddEventModal({ isOpen, onClose, familyMembers, onSuccess, editingEvent, creatorId }: Props) {
  const isEditing = !!editingEvent;

  const getInitialFormData = () => ({
    title: editingEvent?.title || "",
    emoji: editingEvent?.metadata?.emoji || "",
    event_date: editingEvent?.event_date || getLocalDateString(),
    event_time: editingEvent?.schedule_data?.start_time || "",
    is_all_day: editingEvent?.schedule_data?.all_day || false,
    participants: editingEvent?.participants || [] as string[],
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or editingEvent changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setError(null);
    }
  }, [isOpen, editingEvent?.id]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Please enter an event name");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/events/${editingEvent!.id}` : "/api/events";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          emoji: formData.emoji || null,
          event_date: formData.event_date,
          event_time: formData.event_time || null,
          is_all_day: formData.is_all_day,
          participants: formData.participants,
          ...(creatorId && { creatorId }), // Kid profile ID for attribution
        }),
      });

      const result = await response.json();

      if (response.ok && result.event) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || `Failed to ${isEditing ? "update" : "create"} event`);
      }
    } catch (err) {
      console.error(`Error ${isEditing ? "updating" : "creating"} event:`, err);
      setError(`Failed to ${isEditing ? "update" : "create"} event`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.includes(memberId)
        ? prev.participants.filter((id) => id !== memberId)
        : [...prev.participants, memberId],
    }));
  };

  const selectAll = () => {
    setFormData((prev) => ({
      ...prev,
      participants: familyMembers.map((m) => m.id),
    }));
  };

  const selectKids = () => {
    setFormData((prev) => ({
      ...prev,
      participants: familyMembers.filter((m) => m.role === "child").map((m) => m.id),
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => onClose()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          width: "90%",
          maxWidth: "400px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
            {isEditing ? "✏️ Edit Event" : "📅 Add Event"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
              color: "var(--color-text-light)",
            }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {error && (
            <div
              style={{
                color: "var(--color-warning)",
                fontSize: "0.875rem",
                padding: "0.5rem",
                backgroundColor: "#fef2f2",
                borderRadius: "0.5rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Event Name + Emoji (same row, responsive) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Event Name *
            </label>
            <div class="name-emoji-row">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.currentTarget.value })}
                placeholder="e.g., Soccer Practice"
                class="event-name-input"
                required
              />
              <select
                value={formData.emoji || "📅"}
                onChange={(e) => setFormData({ ...formData, emoji: e.currentTarget.value })}
                class="emoji-select"
                aria-label="Event emoji"
              >
                <option value="📅">📅</option>
                <option value="🏀">🏀</option>
                <option value="⚾">⚾</option>
                <option value="🏈">🏈</option>
                <option value="⚽">⚽</option>
                <option value="🎾">🎾</option>
                <option value="🏊">🏊</option>
                <option value="🎹">🎹</option>
                <option value="🎨">🎨</option>
                <option value="📚">📚</option>
                <option value="🏥">🏥</option>
                <option value="💼">💼</option>
                <option value="🛒">🛒</option>
                <option value="🚗">🚗</option>
                <option value="🎂">🎂</option>
                <option value="🎓">🎓</option>
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Date *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.currentTarget.value })}
                min={getLocalDateString()}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                }}
                required
              />
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Time
              </label>
              <input
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.currentTarget.value })}
                disabled={formData.is_all_day}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  opacity: formData.is_all_day ? 0.5 : 1,
                }}
              />
            </div>
          </div>

          {/* All Day Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="is_all_day"
              checked={formData.is_all_day}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_all_day: e.currentTarget.checked,
                  event_time: e.currentTarget.checked ? "" : formData.event_time,
                })
              }
              style={{ width: "1rem", height: "1rem" }}
            />
            <label htmlFor="is_all_day" style={{ fontSize: "0.875rem" }}>
              All day event
            </label>
          </div>

          {/* Participants */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Who's participating?
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  padding: "0.25rem 0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.25rem",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={selectKids}
                style={{
                  padding: "0.25rem 0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.25rem",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Kids Only
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    border: "1px solid",
                    borderColor: formData.participants.includes(member.id)
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                    borderRadius: "0.5rem",
                    backgroundColor: formData.participants.includes(member.id)
                      ? "var(--color-primary)"
                      : "white",
                    color: formData.participants.includes(member.id) ? "white" : "var(--color-text)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div class="modal-footer" style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              class="btn btn-secondary"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
                color: "var(--color-text)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                backgroundColor: "var(--color-primary)",
                color: "white",
                fontWeight: "600",
              }}
            >
              {isSubmitting
                ? (isEditing ? "Saving..." : "Creating...")
                : (isEditing ? "Save Changes" : "Create Event")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

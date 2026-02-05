/**
 * Add/Edit Event Modal Component
 * Supports: end time, multi-day (duration), repeating events (preset patterns)
 */

import { useState, useEffect } from "preact/hooks";
import ModalHeader from "../components/ModalHeader.tsx";

// Helper to get local date as YYYY-MM-DD
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to get date 3 months from a given date (default repeat until)
const getDefaultUntilDate = (eventDate: string): string => {
  const date = new Date(eventDate);
  date.setMonth(date.getMonth() + 3);
  // Use local date components to avoid UTC timezone issues
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    end_time?: string;
    duration_days?: number;
  };
  recurrence_data?: {
    is_recurring?: boolean;
    pattern?: "weekly" | "biweekly" | "monthly";
    until_date?: string;
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

  const getInitialFormData = () => {
    const eventDate = editingEvent?.event_date || getLocalDateString();
    const durationDays = editingEvent?.schedule_data?.duration_days || 1;
    return {
      title: editingEvent?.title || "",
      emoji: editingEvent?.metadata?.emoji || "",
      event_date: eventDate,
      event_time: editingEvent?.schedule_data?.start_time || "",
      end_time: editingEvent?.schedule_data?.end_time || "",
      is_all_day: editingEvent?.schedule_data?.all_day || false,
      is_multi_day: durationDays > 1,
      duration_days: durationDays > 1 ? durationDays : 2, // Default to 2 when enabling
      repeat_pattern: editingEvent?.recurrence_data?.pattern || "",
      repeat_until: editingEvent?.recurrence_data?.until_date || getDefaultUntilDate(eventDate),
      participants: editingEvent?.participants || [] as string[],
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
          end_time: formData.end_time || null,
          is_all_day: formData.is_all_day,
          duration_days: formData.is_multi_day ? formData.duration_days : 1,
          repeat_pattern: formData.repeat_pattern || null,
          repeat_until: formData.repeat_pattern ? formData.repeat_until : null,
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

  const handleDelete = async () => {
    if (!editingEvent || !confirm("Delete this event?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const result = await response.json();
        setError(result.error || "Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete event");
    } finally {
      setIsDeleting(false);
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
        <ModalHeader
          title={isEditing ? "Edit Event" : "Add Event"}
          onBack={onClose}
          submitLabel={isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Save Event")}
          isSubmitting={isSubmitting}
          formId="event-form"
        />

        <form
          id="event-form"
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

          {/* Date */}
          <div>
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
              onChange={(e) => setFormData({
                ...formData,
                event_date: e.currentTarget.value,
                // Update repeat_until if it was auto-set
                repeat_until: formData.repeat_pattern && !formData.repeat_until
                  ? getDefaultUntilDate(e.currentTarget.value)
                  : formData.repeat_until,
              })}
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

          {/* Start Time and End Time (hidden when all-day) */}
          {!formData.is_all_day && (
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
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.currentTarget.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                  }}
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
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.currentTarget.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                  }}
                />
              </div>
            </div>
          )}

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
                  end_time: e.currentTarget.checked ? "" : formData.end_time,
                })
              }
              style={{ width: "1rem", height: "1rem" }}
            />
            <label htmlFor="is_all_day" style={{ fontSize: "0.875rem" }}>
              All day event
            </label>
          </div>

          {/* Multi-day Event */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="is_multi_day"
              checked={formData.is_multi_day}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_multi_day: e.currentTarget.checked,
                })
              }
              style={{ width: "1rem", height: "1rem" }}
            />
            <label htmlFor="is_multi_day" style={{ fontSize: "0.875rem" }}>
              Multi-day event
            </label>
          </div>
          {formData.is_multi_day && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "1.5rem" }}>
              <label style={{ fontSize: "0.875rem" }}>Duration:</label>
              <input
                type="number"
                min="2"
                max="14"
                value={formData.duration_days}
                onChange={(e) => setFormData({
                  ...formData,
                  duration_days: parseInt(e.currentTarget.value) || 2,
                })}
                style={{
                  width: "4rem",
                  padding: "0.5rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                }}
              />
              <span style={{ fontSize: "0.875rem" }}>days</span>
            </div>
          )}

          {/* Repeating Event */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Repeats
            </label>
            <select
              value={formData.repeat_pattern}
              onChange={(e) => {
                const pattern = e.currentTarget.value;
                setFormData({
                  ...formData,
                  repeat_pattern: pattern,
                  // Set default until date when enabling repeat
                  repeat_until: pattern && !formData.repeat_until
                    ? getDefaultUntilDate(formData.event_date)
                    : formData.repeat_until,
                });
              }}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "1rem",
              }}
            >
              <option value="">No repeat</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {formData.repeat_pattern && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Until
              </label>
              <input
                type="date"
                value={formData.repeat_until}
                onChange={(e) => setFormData({ ...formData, repeat_until: e.currentTarget.value })}
                min={formData.event_date}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                }}
              />
            </div>
          )}

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

          {/* Delete button - only when editing */}
          {isEditing && (
            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-warning)",
                  fontSize: "0.875rem",
                  cursor: isDeleting ? "wait" : "pointer",
                  padding: 0,
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}

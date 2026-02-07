/**
 * Add Chore Modal with recurrence options
 * Features: name, assign, due date, points, and Once/Daily/Custom repeats
 */

import { useEffect, useState } from "preact/hooks";
import { formatEventDate } from "../lib/utils/household.ts";
import ModalHeader from "../components/ModalHeader.tsx";

// Helper to get local date as YYYY-MM-DD (avoids UTC timezone issues)
const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${
    String(now.getDate()).padStart(2, "0")
  }`;
};

// Shared styles to reduce repetition
const labelStyle = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: "500",
  marginBottom: "0.5rem",
} as const;
const inputStyle = {
  width: "100%",
  padding: "0.75rem",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "1rem",
} as const;
const DAY_LABELS: Record<string, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};
const DAY_FULL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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
  metadata?: {
    emoji?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: FamilyMember[];
  onSuccess?: () => void;
  preSelectedEventId?: string; // Pre-select an event when opened from event card
  preSelectedAssignee?: string; // Pre-select assignee (first participant from event)
}

export default function AddChoreModal(
  {
    isOpen,
    onClose,
    familyMembers,
    onSuccess,
    preSelectedEventId,
    preSelectedAssignee,
  }: Props,
) {
  // Default points: 0 for event-linked chores (missions), 5 for regular chores
  const defaultPoints = preSelectedEventId ? 0 : 5;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    assignedTo: preSelectedAssignee || "",
    points: defaultPoints,
    dueDate: getLocalDateString(), // Today's date
    familyEventId: preSelectedEventId || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Recurrence state
  const [frequency, setFrequency] = useState<"once" | "daily" | "custom">(
    "once",
  );
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  // Fetch events when modal opens and set pre-selected values
  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // When events are loaded and we have a preSelectedEventId, set form defaults
  useEffect(() => {
    if (isOpen && preSelectedEventId && events.length > 0) {
      const selectedEvent = events.find((e) => e.id === preSelectedEventId);
      setFormData((prev) => ({
        ...prev,
        familyEventId: preSelectedEventId,
        assignedTo: preSelectedAssignee || prev.assignedTo,
        points: 0, // Event-linked chores default to 0 points (missions)
        dueDate: selectedEvent?.event_date || prev.dueDate, // Use event date, not today
      }));
    }
  }, [isOpen, preSelectedEventId, preSelectedAssignee, events]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Get all family members for assignment (both parents and children)
  const assignableMembers = familyMembers;

  // Handle event selection - update due date to match event date
  const handleEventChange = (eventId: string) => {
    const selectedEvent = events.find((e) => e.id === eventId);
    setFormData((prev) => ({
      ...prev,
      familyEventId: eventId,
      // Update due date to event date, default to 0 points for event-linked chores
      dueDate: selectedEvent?.event_date || prev.dueDate,
      points: eventId ? 0 : prev.points,
    }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.name.trim()) {
      setError("Please enter a chore name");
      return;
    }
    if (!formData.assignedTo) {
      setError("Please assign the chore to someone");
      return;
    }
    if (frequency === "custom" && recurringDays.length === 0) {
      setError("Please select at least one day for custom recurring chores");
      return;
    }

    setIsSubmitting(true);

    // Determine if recurring and which days
    const isRecurring = frequency !== "once";
    const allDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const daysToSend = frequency === "daily"
      ? allDays
      : frequency === "custom"
      ? recurringDays
      : undefined;

    try {
      const response = await fetch("/api/chores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          points: formData.points,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate + "T12:00:00", // Noon local, no Z = treated as local time
          category: "household",
          familyEventId: formData.familyEventId || null,
          isRecurring,
          recurringDays: daysToSend,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          description: "",
          assignedTo: "",
          points: 5,
          dueDate: getLocalDateString(),
          familyEventId: "",
        });
        setFrequency("once");
        setRecurringDays([]);

        onSuccess?.();
        onClose();

        // Trigger page refresh to show new chore
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setError(result.error || "Failed to create chore");
      }
    } catch (err) {
      console.error("Error creating chore:", err);
      setError("Failed to create chore");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
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
        className="modal"
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
          title="Add New Chore"
          onBack={onClose}
          submitLabel={isSubmitting
            ? "Creating..."
            : frequency === "once"
            ? "Create Chore"
            : frequency === "daily"
            ? "Create Daily Chore"
            : "Create Recurring Chore"}
          isSubmitting={isSubmitting}
          formId="chore-form"
        />

        <form
          id="chore-form"
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

          <div>
            <label style={labelStyle}>Chore Name *</label>
            <input
              type="text"
              value={formData.name}
              placeholder="e.g., Take out trash"
              required
              onChange={(e) =>
                setFormData({ ...formData, name: e.currentTarget.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Assign To *</label>
            <select
              value={formData.assignedTo}
              required
              style={inputStyle}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.currentTarget.value })}
            >
              <option value="">Select family member</option>
              {assignableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.role === "parent" ? "(Parent)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Points</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.points}
                style={inputStyle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    points: parseInt(e.currentTarget.value) || 0,
                  })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                {frequency === "once" ? "Due Date" : "Start Date"}
              </label>
              <input
                type="date"
                value={formData.dueDate}
                min={getLocalDateString()}
                style={inputStyle}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.currentTarget.value })}
              />
            </div>
          </div>

          {/* Repeats Selector */}
          <div>
            <label style={labelStyle}>Repeats</label>
            <div className="frequency-segmented">
              {(["once", "daily", "custom"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`frequency-btn ${frequency === f ? "active" : ""}`}
                  onClick={() => setFrequency(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Day Pills (only for Custom frequency) */}
          {frequency === "custom" && (
            <div>
              <label style={labelStyle}>Select Days</label>
              <div className="day-pills">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    title={DAY_FULL[day]}
                    className={`day-pill ${
                      recurringDays.includes(day) ? "active" : ""
                    }`}
                    onClick={() =>
                      setRecurringDays(
                        recurringDays.includes(day)
                          ? recurringDays.filter((d) => d !== day)
                          : [...recurringDays, day],
                      )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurring hint */}
          {frequency !== "once" && (
            <div className="recurring-hint">
              {frequency === "daily"
                ? "✓ Appears every day"
                : recurringDays.length > 0
                ? `✓ ${
                  recurringDays.map((d) => DAY_FULL[d].slice(0, 3)).join(", ")
                }`
                : "← Select days above"}
            </div>
          )}

          {/* Link to Event (optional) */}
          {events.length > 0 && (
            <div>
              <label style={labelStyle}>📅 Link to Event (optional)</label>
              <select
                value={formData.familyEventId}
                style={inputStyle}
                onChange={(e) => handleEventChange(e.currentTarget.value)}
              >
                <option value="">(none)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.metadata?.emoji || "📅"} {ev.title}{" "}
                    ({formatEventDate(ev)})
                  </option>
                ))}
              </select>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-light)",
                  marginTop: "0.25rem",
                }}
              >
                Linked chores show as "missions" for the event
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Description (Optional)</label>
            <textarea
              value={formData.description}
              placeholder="Any special instructions..."
              rows={2}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.currentTarget.value,
                })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

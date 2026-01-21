/**
 * Simple Add Chore Modal - Under 200 lines
 * Focused on essential functionality: name, assign, due date, points
 * Uses existing modal patterns from project
 */

import { useState, useEffect } from "preact/hooks";
import { formatEventDate } from "../lib/utils/household.ts";

// Helper to get local date as YYYY-MM-DD (avoids UTC timezone issues)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
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

export default function AddChoreModal({ isOpen, onClose, familyMembers, onSuccess, preSelectedEventId, preSelectedAssignee }: Props) {
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

  // Fetch events when modal opens and set pre-selected values
  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // When events are loaded and we have a preSelectedEventId, set form defaults
  useEffect(() => {
    if (isOpen && preSelectedEventId && events.length > 0) {
      const selectedEvent = events.find(e => e.id === preSelectedEventId);
      setFormData(prev => ({
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
    const selectedEvent = events.find(e => e.id === eventId);
    setFormData(prev => ({
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          points: formData.points,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate + "T23:59:59.999Z", // End of day
          category: "household",
          familyEventId: formData.familyEventId || null,
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
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
            Add New Chore
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
              color: "var(--color-text-light)"
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div style={{ 
              color: "var(--color-warning)", 
              fontSize: "0.875rem",
              padding: "0.5rem",
              backgroundColor: "#fef2f2",
              borderRadius: "0.5rem"
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Chore Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
              placeholder="e.g., Take out trash"
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

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Assign To *
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.currentTarget.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "1rem",
              }}
              required
            >
              <option value="">Select family member</option>
              {assignableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.role === "parent" ? "(Parent)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                Points
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.currentTarget.value) || 5 })}
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
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.currentTarget.value })}
                min={getLocalDateString()}
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

          {/* Link to Event (optional) */}
          {events.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                📅 Link to Event (optional)
              </label>
              <select
                value={formData.familyEventId}
                onChange={(e) => handleEventChange(e.currentTarget.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                }}
              >
                <option value="">(none)</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.metadata?.emoji || "📅"} {event.title} ({formatEventDate(event)})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginTop: "0.25rem" }}>
                Linked chores show as "missions" for the event
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
              placeholder="Any special instructions..."
              rows={2}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                resize: "vertical",
              }}
            />
          </div>

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
              {isSubmitting ? "Creating..." : "Create Chore"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
/**
 * Events List Island Component
 * Displays family events in "This Week" and "Upcoming" sections
 */

import { useState } from "preact/hooks";
import { formatTime, formatEventDate } from "../lib/utils/household.ts";
import AddEventModal from "./AddEventModal.tsx";
import AddChoreModal from "./AddChoreModal.tsx";
import AddPrepTasksModal from "./AddPrepTasksModal.tsx";

interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
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
    source_app?: string;
    emoji?: string;
    prep_tasks?: PrepTask[];
  };
  linked_chores_count?: number;
  completed_chores_count?: number;
}

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
}

interface Props {
  thisWeek: FamilyEvent[];
  upcoming: FamilyEvent[];
  familyMembers: FamilyMember[];
}

export default function EventsList({ thisWeek, upcoming, familyMembers }: Props) {
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [showPrepTasksModal, setShowPrepTasksModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAddChore = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowAddChoreModal(true);
  };

  const handleAddPrepTasks = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowPrepTasksModal(true);
  };

  const handleEditEvent = (event: FamilyEvent) => {
    setEditingEvent(event);
    setShowAddEventModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event? Linked chores will be unlinked but not deleted.")) {
      return;
    }

    setDeleting(eventId);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete event. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const getEventEmoji = (event: FamilyEvent) => {
    // Return event-specific emoji or empty string (no generic fallback)
    return event.metadata?.emoji || "";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const eventDate = new Date(dateStr + "T00:00:00");
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) {
      return "Today";
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const EventCard = ({ event }: { event: FamilyEvent }) => (
    <div
      class="card"
      style={{
        padding: "1rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-light)",
              marginBottom: "0.25rem",
            }}
          >
            {formatDate(event.event_date)}
            {event.schedule_data?.start_time && !event.schedule_data?.all_day && (
              <> at {formatTime(event.schedule_data.start_time)}</>
            )}
            {event.schedule_data?.all_day && " (All day)"}
          </div>
          <div
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
            }}
          >
            {getEventEmoji(event)} {event.title}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            {(() => {
              const prepTasks = event.metadata?.prep_tasks || [];
              const prepDone = prepTasks.filter(t => t.done).length;
              const prepTotal = prepTasks.length;
              const choresLinked = event.linked_chores_count || 0;
              const choresDone = event.completed_chores_count || 0;

              const parts = [];
              if (prepTotal > 0) {
                parts.push(`Prep: ${prepDone}/${prepTotal}`);
              }
              if (choresLinked > 0) {
                parts.push(`Chores: ${choresDone}/${choresLinked}`);
              }
              return parts.length > 0 ? parts.join(" · ") : "No tasks yet";
            })()}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
          {(() => {
            const prepCount = (event.metadata?.prep_tasks || []).length;
            return (
              <button
                onClick={() => handleAddPrepTasks(event.id)}
                style={{
                  padding: "0.375rem 0.75rem",
                  border: "1px solid var(--color-primary)",
                  background: "white",
                  cursor: "pointer",
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  borderRadius: "0.25rem",
                  fontWeight: "500",
                }}
              >
                {prepCount > 0 ? `Prep (${prepCount})` : "+ Prep Tasks"}
              </button>
            );
          })()}
          <button
            onClick={() => handleAddChore(event.id)}
            style={{
              padding: "0.375rem 0.75rem",
              border: "1px solid var(--color-border)",
              background: "white",
              cursor: "pointer",
              color: "var(--color-text-light)",
              fontSize: "0.75rem",
              borderRadius: "0.25rem",
              fontWeight: "500",
            }}
          >
            + Chore
          </button>
          <button
            onClick={() => handleEditEvent(event)}
            style={{
              padding: "0.25rem 0.5rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--color-primary)",
              fontSize: "0.75rem",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(event.id)}
            disabled={deleting === event.id}
            style={{
              padding: "0.25rem 0.5rem",
              border: "none",
              background: "none",
              cursor: deleting === event.id ? "not-allowed" : "pointer",
              color: "var(--color-warning)",
              fontSize: "0.75rem",
            }}
          >
            {deleting === event.id ? "..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );

  const isEmpty = thisWeek.length === 0 && upcoming.length === 0;

  return (
    <div>
      {/* Centered Add button - no redundant header (page header already shows "Family Events") */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={() => setShowAddEventModal(true)}
          class="btn btn-primary"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
          }}
        >
          + Add Event
        </button>
      </div>

      {isEmpty ? (
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
          <p style={{ color: "var(--color-text-light)", marginBottom: "1.5rem" }}>
            No events scheduled yet.
          </p>
          <button
            onClick={() => setShowAddEventModal(true)}
            class="btn btn-secondary"
            style={{ padding: "0.75rem 1.5rem" }}
          >
            Create your first event
          </button>
        </div>
      ) : (
        <>
          {/* This Week Section */}
          {thisWeek.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "var(--color-text-light)",
                  marginBottom: "0.75rem",
                }}
              >
                This Week
              </h3>
              {thisWeek.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          )}

          {/* Upcoming Section */}
          {upcoming.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "var(--color-text-light)",
                  marginBottom: "0.75rem",
                }}
              >
                Upcoming
              </h3>
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          )}
        </>
      )}

      {/* Add/Edit Event Modal */}
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => {
          setShowAddEventModal(false);
          setEditingEvent(null);
        }}
        familyMembers={familyMembers}
        onSuccess={() => window.location.reload()}
        editingEvent={editingEvent}
      />

      {/* Add Chore Modal (for linking chores to events) */}
      {(() => {
        // Find the selected event to get its first participant
        const allEvents = [...thisWeek, ...upcoming];
        const selectedEvent = selectedEventId ? allEvents.find(e => e.id === selectedEventId) : null;
        const firstParticipant = selectedEvent?.participants?.[0];

        return (
          <AddChoreModal
            isOpen={showAddChoreModal}
            onClose={() => {
              setShowAddChoreModal(false);
              setSelectedEventId(null);
            }}
            familyMembers={familyMembers}
            preSelectedEventId={selectedEventId || undefined}
            preSelectedAssignee={firstParticipant}
            onSuccess={() => window.location.reload()}
          />
        );
      })()}

      {/* Add Prep Tasks Modal */}
      {(() => {
        const allEvents = [...thisWeek, ...upcoming];
        const selectedEvent = selectedEventId ? allEvents.find(e => e.id === selectedEventId) : null;

        return (
          <AddPrepTasksModal
            isOpen={showPrepTasksModal}
            onClose={() => {
              setShowPrepTasksModal(false);
              setSelectedEventId(null);
            }}
            event={selectedEvent || null}
            familyMembers={familyMembers}
            onSuccess={() => window.location.reload()}
          />
        );
      })()}
    </div>
  );
}

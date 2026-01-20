/**
 * Events List Island Component
 * Displays family events in "This Week" and "Upcoming" sections
 */

import { useState } from "preact/hooks";
import { formatTime, formatEventDate } from "../lib/utils/household.ts";
import AddEventModal from "./AddEventModal.tsx";
import AddChoreModal from "./AddChoreModal.tsx";

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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAddChore = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowAddChoreModal(true);
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
    return event.metadata?.emoji || "📅";
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
            {(event.linked_chores_count || 0) > 0 ? (
              <>
                {event.linked_chores_count} chore{event.linked_chores_count !== 1 ? "s" : ""} linked (
                {event.completed_chores_count || 0} done)
              </>
            ) : (
              "No chores linked"
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
          <button
            onClick={() => handleAddChore(event.id)}
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
            + Add Chore
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
      {/* Header with Add button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
          📅 Family Events
        </h2>
        <button
          onClick={() => setShowAddEventModal(true)}
          class="btn btn-primary"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
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

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        familyMembers={familyMembers}
        onSuccess={() => window.location.reload()}
      />

      {/* Add Chore Modal (for linking chores to events) */}
      <AddChoreModal
        isOpen={showAddChoreModal}
        onClose={() => {
          setShowAddChoreModal(false);
          setSelectedEventId(null);
        }}
        familyMembers={familyMembers}
        preSelectedEventId={selectedEventId || undefined}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

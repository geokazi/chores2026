/**
 * Events List Island Component
 * Displays family events in "This Week" and "Upcoming" sections
 */

import { useState } from "preact/hooks";
import { formatTime, formatEventDate } from "../lib/utils/household.ts";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";
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
    source_app?: string;
    emoji?: string;
    prep_tasks?: PrepTask[];
  };
  linked_chores_count?: number;
  completed_chores_count?: number;
  created_by_profile_id?: string; // Kid profile ID when kid creates event
  // Expansion fields (from server-side expansion)
  display_date?: string;
  display_suffix?: string;
  is_recurring_instance?: boolean;
  is_multi_day_instance?: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
}

interface Props {
  thisWeek: FamilyEvent[];
  upcoming: FamilyEvent[];
  pastEventsCount?: number;
  familyMembers: FamilyMember[];
}

export default function EventsList({ thisWeek, upcoming, pastEventsCount = 0, familyMembers }: Props) {
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [showPrepTasksModal, setShowPrepTasksModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  // Local state for optimistic updates on prep tasks
  const [localEvents, setLocalEvents] = useState<Map<string, FamilyEvent>>(new Map());

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleTogglePrepTask = async (event: FamilyEvent, taskId: string, done: boolean) => {
    setTogglingTask(taskId);

    // Optimistic update
    const updatedTasks = (event.metadata?.prep_tasks || []).map(t =>
      t.id === taskId ? { ...t, done } : t
    );
    const updatedEvent = {
      ...event,
      metadata: { ...event.metadata, prep_tasks: updatedTasks },
    };
    setLocalEvents(prev => new Map(prev).set(event.id, updatedEvent));

    try {
      const response = await fetch(`/api/events/${event.id}/prep-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, done }),
      });

      if (!response.ok) {
        // Revert on failure
        setLocalEvents(prev => {
          const next = new Map(prev);
          next.delete(event.id);
          return next;
        });
        alert("Failed to update task");
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      setLocalEvents(prev => {
        const next = new Map(prev);
        next.delete(event.id);
        return next;
      });
      alert("Failed to update task");
    } finally {
      setTogglingTask(null);
    }
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const member = familyMembers.find(m => m.id === assigneeId);
    return member?.name || null;
  };

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

  const getParticipants = (event: FamilyEvent) => {
    if (!event.participants || event.participants.length === 0) {
      return null; // Will show "Everyone" text
    }
    return event.participants
      .map(id => familyMembers.find(m => m.id === id))
      .filter(Boolean) as FamilyMember[];
  };

  // Get creator name for kid-created events (returns null for parent-created)
  const getKidCreatorName = (event: FamilyEvent) => {
    if (!event.created_by_profile_id) return null;
    const creator = familyMembers.find(m => m.id === event.created_by_profile_id);
    // Only show badge for kid-created events
    if (creator && creator.role === "child") {
      return creator.name;
    }
    return null;
  };

  const handleParticipantClick = (member: FamilyMember) => {
    // Set the active session for this member
    ActiveKidSessionManager.setActiveKid(member.id, member.name);
    // Navigate to appropriate dashboard
    if (member.role === "parent") {
      window.location.href = "/parent/my-chores";
    } else {
      window.location.href = "/kid/dashboard";
    }
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

  const EventCard = ({ event: originalEvent }: { event: FamilyEvent }) => {
    // Use local state for optimistic updates, fallback to original
    const event = localEvents.get(originalEvent.id) || originalEvent;
    const prepTasks = event.metadata?.prep_tasks || [];
    const prepDone = prepTasks.filter(t => t.done).length;
    const prepTotal = prepTasks.length;

    // Smart expansion: auto-expand if ≤3 tasks, otherwise use toggle
    const shouldAutoExpand = prepTotal > 0 && prepTotal <= 3;
    const isExpanded = shouldAutoExpand || expandedEvents.has(event.id);

    return (
    <div
      class="card"
      style={{
        padding: "1rem",
        marginBottom: "0.75rem",
      }}
    >
      {/* Event Info */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            marginBottom: "0.25rem",
          }}
        >
          {formatDate(event.display_date || event.event_date)}
          {event.schedule_data?.start_time && !event.schedule_data?.all_day && (
            <> at {formatTime(event.schedule_data.start_time)}</>
          )}
          {event.schedule_data?.end_time && !event.schedule_data?.all_day && (
            <> - {formatTime(event.schedule_data.end_time)}</>
          )}
          {event.schedule_data?.all_day && " (All day)"}
        </div>
        <div
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            {getEventEmoji(event)}{getEventEmoji(event) ? " " : ""}{event.title}
            {event.display_suffix && (
              <span style={{ fontWeight: "400", color: "var(--color-text-light)" }}>
                {event.display_suffix}
              </span>
            )}
          </span>
          {/* Kid creator badge */}
          {getKidCreatorName(event) && (
            <span
              style={{
                fontSize: "0.625rem",
                padding: "0.125rem 0.375rem",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                borderRadius: "0.25rem",
                fontWeight: "500",
              }}
            >
              Added by {getKidCreatorName(event)}
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
          <span>👤</span>
          {(() => {
            const participants = getParticipants(event);
            if (!participants) {
              return <span>Everyone</span>;
            }
            return participants.map((member, idx) => (
              <span key={member.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParticipantClick(member);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "inherit",
                  }}
                >
                  {member.name}
                </button>
                {idx < participants.length - 1 && ", "}
              </span>
            ));
          })()}
        </div>
        {/* Prep Tasks Summary or Inline List */}
        {prepTotal === 0 && (event.linked_chores_count || 0) === 0 && (
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            No tasks yet
          </div>
        )}

        {/* Show summary for chores (always) */}
        {(event.linked_chores_count || 0) > 0 && (
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            Chores: {event.completed_chores_count || 0}/{event.linked_chores_count}
          </div>
        )}

        {/* Prep tasks section */}
        {prepTotal > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            {/* Header with toggle for >3 tasks */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: isExpanded ? "0.5rem" : "0",
            }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
                Prep: {prepDone}/{prepTotal}
              </span>
              {prepTotal > 3 && (
                <button
                  onClick={() => toggleExpanded(event.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-primary)",
                    fontSize: "0.75rem",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}>▶</span>
                  {isExpanded ? "Hide" : "Show"}
                </button>
              )}
            </div>

            {/* Inline task list (shown when expanded or auto-expanded) */}
            {isExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {prepTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleTogglePrepTask(event, task.id, !task.done)}
                    disabled={togglingTask === task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.5rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.25rem",
                      background: task.done ? "#f0fdf4" : "white",
                      cursor: togglingTask === task.id ? "wait" : "pointer",
                      textAlign: "left",
                      width: "100%",
                      opacity: togglingTask === task.id ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontSize: "0.875rem" }}>
                      {togglingTask === task.id ? "⏳" : (task.done ? "✅" : "☐")}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: "0.8125rem",
                      textDecoration: task.done ? "line-through" : "none",
                      color: task.done ? "var(--color-text-light)" : "var(--color-text)",
                    }}>
                      {task.text}
                    </span>
                    {getAssigneeName(task.assignee_id) && (
                      <span style={{ fontSize: "0.6875rem", color: "var(--color-text-light)" }}>
                        ({getAssigneeName(task.assignee_id)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Export Link */}
      <div style={{ marginTop: "0.5rem" }}>
        <a
          href={`/api/events/${event.id}/calendar`}
          download={`${event.title}.ics`}
          style={{
            fontSize: "0.75rem",
            color: "var(--color-primary)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          📅 Add to Calendar
        </a>
      </div>

      {/* Actions - Bottom Split Layout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--color-border)",
          gap: "0.5rem",
        }}
      >
        {/* Primary Actions (left) */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(() => {
            const prepCount = (event.metadata?.prep_tasks || []).length;
            return (
              <button
                onClick={() => handleAddPrepTasks(event.id)}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid var(--color-primary)",
                  background: "white",
                  cursor: "pointer",
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  borderRadius: "0.25rem",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                }}
              >
                {prepCount > 0 ? `Prep (${prepCount})` : "+ Prep"}
              </button>
            );
          })()}
          <button
            onClick={() => handleAddChore(event.id)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid var(--color-border)",
              background: "white",
              cursor: "pointer",
              color: "var(--color-text)",
              fontSize: "0.75rem",
              borderRadius: "0.25rem",
              fontWeight: "500",
              whiteSpace: "nowrap",
            }}
          >
            + Chore
          </button>
        </div>

        {/* Secondary Actions (right) */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={() => handleEditEvent(event)}
            style={{
              padding: "0.5rem",
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
              padding: "0.5rem",
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
  };

  const isEmpty = thisWeek.length === 0 && upcoming.length === 0;

  return (
    <div>
      {/* Centered Add button - no redundant header (page header already shows "Family Events") */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "1rem",
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
          {pastEventsCount > 0 ? (
            <>
              <p style={{ color: "var(--color-text-light)", marginBottom: "0.5rem" }}>
                No upcoming events.
              </p>
              <p style={{ color: "var(--color-text-light)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
                You've had <strong>{pastEventsCount}</strong> event{pastEventsCount === 1 ? "" : "s"} in the past.
              </p>
              <button
                onClick={() => setShowAddEventModal(true)}
                class="btn btn-secondary"
                style={{ padding: "0.75rem 1.5rem" }}
              >
                Schedule your next one
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
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
                <EventCard key={`${event.id}-${event.display_date || event.event_date}`} event={event} />
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
                <EventCard key={`${event.id}-${event.display_date || event.event_date}`} event={event} />
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

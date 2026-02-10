/**
 * Events List Island Component
 * Displays family events in "This Week" and "Upcoming" sections
 * Uses shared EventCard component for progressive disclosure UI
 */

import { useMemo, useState } from "preact/hooks";
import AddEventModal from "./AddEventModal.tsx";
import AddChoreModal from "./AddChoreModal.tsx";
import AddPrepTasksModal from "./AddPrepTasksModal.tsx";
import EventCard from "./EventCard.tsx";

interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
  type?: "shop" | "task";  // "shop" = shopping item, "task" = to-do (default)
}

interface LinkedChore {
  id: string;
  status: string;
  point_value: number;
  assigned_to_profile_id?: string;
  chore_template?: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
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
  linked_chores?: LinkedChore[];
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

export default function EventsList(
  { thisWeek, upcoming, pastEventsCount = 0, familyMembers }: Props,
) {
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [showPrepTasksModal, setShowPrepTasksModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  // Local state for optimistic updates on prep tasks
  const [localEvents, setLocalEvents] = useState<Map<string, FamilyEvent>>(
    new Map(),
  );
  // Calendar added state (persisted in localStorage)
  const [calendarAddedIds, setCalendarAddedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("choregami_calendar_events");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Toast message for clipboard copy
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-expand "Today" events by default
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${
      String(now.getMonth() + 1).padStart(2, "0")
    }-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(() => {
    // Start with today's events expanded
    const todayEvents = [...thisWeek, ...upcoming].filter((e) =>
      (e.display_date || e.event_date) === todayStr
    );
    return new Set(todayEvents.map((e) => e.id));
  });

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleTogglePrepTask = async (
    event: FamilyEvent,
    taskId: string,
    done: boolean,
  ) => {
    setTogglingTask(taskId);

    // Optimistic update
    const updatedTasks = (event.metadata?.prep_tasks || []).map((t) =>
      t.id === taskId ? { ...t, done } : t
    );
    const updatedEvent = {
      ...event,
      metadata: { ...event.metadata, prep_tasks: updatedTasks },
    };
    setLocalEvents((prev) => new Map(prev).set(event.id, updatedEvent));

    try {
      const response = await fetch(`/api/events/${event.id}/prep-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, done }),
      });

      if (!response.ok) {
        // Revert on failure
        setLocalEvents((prev) => {
          const next = new Map(prev);
          next.delete(event.id);
          return next;
        });
        alert("Failed to update task");
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      setLocalEvents((prev) => {
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
    const member = familyMembers.find((m) => m.id === assigneeId);
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

  const handleAddToCalendar = (event: FamilyEvent) => {
    // Trigger download via hidden link
    const link = document.createElement("a");
    link.href = `/api/events/${event.id}/calendar`;
    link.download = `${event.title}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mark as added in localStorage
    const newIds = new Set(calendarAddedIds).add(event.id);
    setCalendarAddedIds(newIds);
    localStorage.setItem(
      "choregami_calendar_events",
      JSON.stringify([...newIds]),
    );
  };

  const handleDelete = async (eventId: string) => {
    if (
      !confirm(
        "Delete this event? Linked chores will be unlinked but not deleted.",
      )
    ) {
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

  // Handle prep task edit - opens the prep tasks modal for the event
  const handlePrepTaskEdit = (eventId: string, _taskId: string) => {
    // For now, just open the prep tasks modal - user can edit all tasks there
    setSelectedEventId(eventId);
    setShowPrepTasksModal(true);
  };

  // Handle prep task delete
  const handlePrepTaskDelete = async (event: FamilyEvent, taskId: string) => {
    // Optimistic update - remove the task from local state
    const updatedTasks = (event.metadata?.prep_tasks || []).filter((t) =>
      t.id !== taskId
    );
    const updatedEvent = {
      ...event,
      metadata: { ...event.metadata, prep_tasks: updatedTasks },
    };
    setLocalEvents((prev) => new Map(prev).set(event.id, updatedEvent));

    try {
      const response = await fetch(`/api/events/${event.id}/prep-task`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        // Revert on failure
        setLocalEvents((prev) => {
          const next = new Map(prev);
          next.delete(event.id);
          return next;
        });
        alert("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting prep task:", error);
      setLocalEvents((prev) => {
        const next = new Map(prev);
        next.delete(event.id);
        return next;
      });
      alert("Failed to delete task");
    }
  };

  // Handle chore delete (unlink from event)
  const handleChoreDelete = async (choreId: string) => {
    try {
      const response = await fetch(`/api/chores/${choreId}/unlink-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to remove chore from event");
      }
    } catch (error) {
      console.error("Error unlinking chore:", error);
      alert("Failed to remove chore from event");
    }
  };

  // Handle export shopping items to clipboard
  const handleExportShopping = async (event: FamilyEvent, items: PrepTask[]) => {
    // Format items as a simple list
    const eventTitle = event.title;
    const text = `Shopping list for "${eventTitle}":\n${items.map(i => `☐ ${i.text}`).join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setToastMessage("Copied! Paste into your Reminders app");
      setTimeout(() => setToastMessage(null), 3000);

      // Track demand signal (fire-and-forget)
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metric: "prep_export",
          meta: { event_id: event.id, item_count: items.length }
        }),
      }).catch(() => {});
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show alert with text
      alert(`Copy this to your shopping list:\n\n${text}`);
    }
  };

  // Render event using shared EventCard component with progressive disclosure
  const renderEventCard = (originalEvent: FamilyEvent) => {
    // Use local state for optimistic updates, fallback to original
    const event = localEvents.get(originalEvent.id) || originalEvent;
    const isExpanded = expandedEvents.has(event.id);

    // Adapt FamilyEvent to EventCard's expected format
    const eventData = {
      ...event,
      event_date: event.display_date || event.event_date,
    };

    return (
      <div
        key={`${event.id}-${event.display_date || event.event_date}`}
        style={{ marginBottom: "0.75rem" }}
      >
        <EventCard
          event={eventData}
          isExpanded={isExpanded}
          onToggleExpand={() => toggleExpanded(event.id)}
          onEdit={() => handleEditEvent(event)}
          onDelete={() => handleDelete(event.id)}
          onAddTask={(type) => {
            if (type === "prep") {
              handleAddPrepTasks(event.id);
            } else {
              handleAddChore(event.id);
            }
          }}
          onTaskToggle={(taskId, done) =>
            handleTogglePrepTask(event, taskId, done)}
          onPrepTaskEdit={(taskId) => handlePrepTaskEdit(event.id, taskId)}
          onPrepTaskDelete={(taskId) => handlePrepTaskDelete(event, taskId)}
          onChoreDelete={(choreId) => handleChoreDelete(choreId)}
          onAddToCalendar={() => handleAddToCalendar(event)}
          onExportShopping={(items) => handleExportShopping(event, items)}
          familyMembers={familyMembers}
          showOverflowMenu={true}
          showAddTask={true}
          calendarAdded={calendarAddedIds.has(event.id)}
          togglingTaskId={togglingTask || undefined}
        />
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

      {isEmpty
        ? (
          <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
            {pastEventsCount > 0
              ? (
                <>
                  <p
                    style={{
                      color: "var(--color-text-light)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    No upcoming events.
                  </p>
                  <p
                    style={{
                      color: "var(--color-text-light)",
                      marginBottom: "1.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    You've had <strong>{pastEventsCount}</strong>{" "}
                    event{pastEventsCount === 1 ? "" : "s"} in the past.
                  </p>
                  <button
                    onClick={() => setShowAddEventModal(true)}
                    class="btn btn-secondary"
                    style={{ padding: "0.75rem 1.5rem" }}
                  >
                    Schedule your next one
                  </button>
                </>
              )
              : (
                <>
                  <p
                    style={{
                      color: "var(--color-text-light)",
                      marginBottom: "1.5rem",
                    }}
                  >
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
        )
        : (
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
                {thisWeek.map(renderEventCard)}
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
                {upcoming.map(renderEventCard)}
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
        const selectedEvent = selectedEventId
          ? allEvents.find((e) => e.id === selectedEventId)
          : null;
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
        const selectedEvent = selectedEventId
          ? allEvents.find((e) => e.id === selectedEventId)
          : null;

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

      {/* Toast notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#065f46",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontSize: "0.875rem",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          ✅ {toastMessage}
        </div>
      )}
    </div>
  );
}

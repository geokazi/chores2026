/**
 * Secure Parent Dashboard Component (Client-Side Active Parent Loading)
 * Same pattern as SecureKidDashboard - reads active parent from session storage
 */

import { useEffect, useMemo, useState } from "preact/hooks";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";
import { groupEventsByTimePeriod } from "../lib/utils/household.ts";
import AppHeader from "./AppHeader.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";
import AddEventModal from "./AddEventModal.tsx";
import EventCard from "./EventCard.tsx";

interface Props {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
}

export default function SecureParentDashboard(
  { family, familyMembers, recentActivity }: Props,
) {
  const [activeParent, setActiveParent] = useState<any>(null);
  const [parentChores, setParentChores] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(
    null,
  );
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [showLaterEvents, setShowLaterEvents] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  // Calendar added state (persisted in localStorage)
  const [calendarAddedIds, setCalendarAddedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("choregami_calendar_events");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Smart grouping for events: Today, This Week, Later
  const groupedEvents = useMemo(() => groupEventsByTimePeriod(upcomingEvents), [
    upcomingEvents,
  ]);

  // Auto-expand "Today" events by default
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${
      String(now.getMonth() + 1).padStart(2, "0")
    }-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Initialize expanded state when events load
  useEffect(() => {
    if (upcomingEvents.length > 0) {
      const todayEvents = upcomingEvents.filter((e) =>
        e.event_date === todayStr
      );
      setExpandedEvents(new Set(todayEvents.map((e) => e.id)));
    }
  }, [upcomingEvents, todayStr]);

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

  useEffect(() => {
    loadActiveParent();
  }, [familyMembers]);

  const loadActiveParent = async () => {
    try {
      // Get active parent from session (reusing kid session manager)
      const activeParentId = ActiveKidSessionManager.getActiveKidId();

      if (!activeParentId) {
        // No active parent - redirect to selector
        window.location.href = "/";
        return;
      }

      // Find parent in family members
      const parent = familyMembers.find((member) =>
        member.id === activeParentId && member.role === "parent"
      );

      if (!parent) {
        // Parent not in family or is not a parent - clear session and redirect
        ActiveKidSessionManager.clearActiveKid();
        window.location.href = "/";
        return;
      }

      setActiveParent(parent);

      // Load parent's chores and events
      await Promise.all([
        loadParentChores(activeParentId),
        loadParentEvents(activeParentId),
      ]);
    } catch (err) {
      console.error("Error loading active parent:", err);
      setError("Failed to load parent information");
    } finally {
      setLoading(false);
    }
  };

  const loadParentChores = async (parentId: string) => {
    try {
      // Secure API call - parent ID in request body, not URL
      const response = await fetch("/api/kids/chores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kidId: parentId }), // Reusing same API
      });

      if (response.ok) {
        const chores = await response.json();
        setParentChores(chores);
      } else {
        console.error("Failed to load chores");
        setParentChores([]);
      }
    } catch (err) {
      console.error("Error loading chores:", err);
      setParentChores([]);
    }
  };

  const loadParentEvents = async (parentId: string) => {
    try {
      // Pass local date to avoid timezone issues
      const now = new Date();
      const localDate = `${now.getFullYear()}-${
        String(now.getMonth() + 1).padStart(2, "0")
      }-${String(now.getDate()).padStart(2, "0")}`;
      const response = await fetch(`/api/events?localDate=${localDate}`);

      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];

        // Filter events where parent is a participant (or show all if no participants)
        const parentEvents = events.filter((event: any) => {
          if (!event.participants || event.participants.length === 0) {
            return true;
          }
          const isParticipant = event.participants.includes(parentId);
          if (!isParticipant) {
            console.log("📅 Event filtered out (not participant):", {
              event: event.title,
              participants: event.participants,
              parentId,
            });
          }
          return isParticipant;
        });

        // Show up to 10 upcoming events from today onwards, sorted earliest first
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingParentEvents = parentEvents
          .filter((event: any) => {
            const eventDate = new Date(event.event_date + "T00:00:00");
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
          })
          .sort((a: any, b: any) => {
            // Sort by event_date ascending (earliest first)
            return a.event_date.localeCompare(b.event_date);
          })
          .slice(0, 10); // Limit to 10 events

        console.log("📅 Parent events loaded:", {
          total: events.length,
          forParent: parentEvents.length,
          upcoming: upcomingParentEvents.length,
          parentId,
        });

        // Fetch chores linked to these events (Fix 0b)
        if (upcomingParentEvents.length > 0) {
          const eventIds = upcomingParentEvents.map((e: any) => e.id);
          try {
            const choresResponse = await fetch("/api/chores/by-events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventIds, memberId: parentId }),
            });
            if (choresResponse.ok) {
              const { chores } = await choresResponse.json();
              console.log("📋 Event-linked chores loaded:", chores.length);

              // Merge chores into events
              const eventsWithChores = upcomingParentEvents.map((
                event: any,
              ) => ({
                ...event,
                linked_chores: chores.filter((c: any) =>
                  c.family_event_id === event.id
                ),
              }));
              setUpcomingEvents(eventsWithChores);
            } else {
              setUpcomingEvents(upcomingParentEvents);
            }
          } catch (err) {
            console.error("Error loading event chores:", err);
            setUpcomingEvents(upcomingParentEvents);
          }
        } else {
          setUpcomingEvents(upcomingParentEvents);
        }
      } else {
        setUpcomingEvents([]);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setUpcomingEvents([]);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    if (!activeParent) return;

    setCompletingChoreId(choreId);

    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: activeParent.id,
          family_id: family.id,
        }),
      });

      if (response.ok) {
        // Reload chores to show updated state
        await loadParentChores(activeParent.id);
      } else {
        console.error("Failed to complete chore");
        alert("Failed to complete chore");
      }
    } catch (error) {
      console.error("Error completing chore:", error);
      alert("Error completing chore");
    } finally {
      setCompletingChoreId(null);
    }
  };

  const handlePrepTaskToggle = async (
    eventId: string,
    taskId: string,
    done: boolean,
  ) => {
    if (!activeParent) return;

    setTogglingTaskId(taskId);

    try {
      // Optimistic update
      setUpcomingEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;
          const prepTasks = event.metadata?.prep_tasks || [];
          return {
            ...event,
            metadata: {
              ...event.metadata,
              prep_tasks: prepTasks.map((t: any) =>
                t.id === taskId ? { ...t, done } : t
              ),
            },
          };
        })
      );

      // Send to API
      const response = await fetch(`/api/events/${eventId}/prep-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, done }),
      });

      if (!response.ok) {
        // Revert on failure
        loadParentEvents(activeParent.id);
      }
    } catch (error) {
      console.error("Failed to toggle prep task:", error);
      loadParentEvents(activeParent.id);
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleCompleteEventChore = async (choreId: string) => {
    if (!activeParent) return;

    setCompletingChoreId(choreId);

    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: activeParent.id,
          family_id: family.id,
        }),
      });

      if (response.ok) {
        // Update local state for linked chores
        setUpcomingEvents((prev) =>
          prev.map((event) => ({
            ...event,
            linked_chores: (event.linked_chores || []).map((c: any) =>
              c.id === choreId ? { ...c, status: "completed" } : c
            ),
          }))
        );
      } else {
        console.error("Failed to complete chore");
        alert("Failed to complete chore");
      }
    } catch (error) {
      console.error("Error completing chore:", error);
      alert("Error completing chore");
    } finally {
      setCompletingChoreId(null);
    }
  };

  const handleAddToCalendar = (event: any) => {
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

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setUpcomingEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        alert("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "var(--color-text-light)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p>Loading your chores...</p>
      </div>
    );
  }

  if (error || !activeParent) {
    return (
      <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--color-warning)" }}>
          {error || "No active parent session found"}
        </p>
        <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
          Back to Family Selection
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Mobile-friendly header */}
      <AppHeader
        currentPage="my-chores"
        pageTitle={`${activeParent.name}'s Board`}
        familyMembers={familyMembers}
        currentUser={activeParent}
        userRole="parent"
      />

      {/* My Chores Section - Compact when empty */}
      {parentChores.length === 0
        ? (
          /* Compact empty state - single line, no card */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              color: "var(--color-text-light)",
              fontSize: "0.9rem",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>✅</span>
            <span>No chores today</span>
          </div>
        )
        : (
          /* Chores list when has chores */
          <div class="card" style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "1rem",
              }}
            >
              My Chores ({parentChores.length})
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {parentChores.map((chore: any) => (
                <div
                  key={chore.id}
                  class="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--color-border)",
                    backgroundColor: chore.status === "completed"
                      ? "#f0f9ff"
                      : "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>
                          {chore.chore_template?.icon || "📋"}
                        </span>
                        <h3
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: "600",
                            margin: 0,
                          }}
                        >
                          {chore.chore_template?.name || "Chore"}
                        </h3>
                      </div>

                      {chore.chore_template?.description && (
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-light)",
                            margin: "0.5rem 0",
                            lineHeight: "1.4",
                          }}
                        >
                          {chore.chore_template.description}
                        </p>
                      )}

                      {/* Due date and time */}
                      {chore.due_date && (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-light)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          📅 Due:{" "}
                          {new Date(chore.due_date).toLocaleDateString()} at
                          {" "}
                          {new Date(chore.due_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "1rem",
                          color: "var(--color-primary)",
                          fontWeight: "600",
                        }}
                      >
                        {chore.point_value} points
                      </div>
                    </div>

                    <div style={{ marginLeft: "1rem" }}>
                      <span
                        onClick={() => chore.status === "pending" &&
                          handleCompleteChore(chore.id)}
                        style={{
                          fontSize: "1.5rem",
                          color: chore.status === "completed"
                            ? "var(--color-success)"
                            : "var(--color-text)",
                          cursor: chore.status === "pending"
                            ? "pointer"
                            : "default",
                          display: "inline-block",
                          padding: "0.5rem",
                          opacity: completingChoreId === chore.id ? 0.5 : 1,
                        }}
                      >
                        {completingChoreId === chore.id
                          ? "⏳"
                          : (chore.status === "completed" ? "✓" : "☐")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* What's Next - Events with Smart Grouping */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          📅 What's Next
        </h2>

        {upcomingEvents.length === 0
          ? (
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                color: "var(--color-text-light)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                📅
              </div>
              <p style={{ margin: 0 }}>No upcoming events</p>
              <a
                href="/parent/events"
                style={{
                  display: "inline-block",
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--color-primary)",
                }}
              >
                + Add Event
              </a>
            </div>
          )
          : (
            <>
              {/* Render event using shared EventCard component */}
              {(() => {
                const renderEventCard = (event: any) => (
                  <div key={event.id} style={{ marginBottom: "0.5rem" }}>
                    <EventCard
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggleExpand={() =>
                        toggleExpanded(event.id)}
                      onEdit={() => {
                        setEditingEvent(event);
                        setShowEditEventModal(true);
                      }}
                      onDelete={() =>
                        handleDeleteEvent(event.id)}
                      onTaskToggle={(taskId, done) =>
                        handlePrepTaskToggle(event.id, taskId, done)}
                      onChoreComplete={handleCompleteEventChore}
                      onAddToCalendar={() => handleAddToCalendar(event)}
                      currentUserId={activeParent.id}
                      familyMembers={familyMembers}
                      showOverflowMenu={true}
                      showAddTask={false}
                      calendarAdded={calendarAddedIds.has(event.id)}
                      togglingTaskId={togglingTaskId || undefined}
                      completingChoreId={completingChoreId || undefined}
                    />
                  </div>
                );

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {/* Today's Events */}
                    {groupedEvents.today.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "var(--color-primary)",
                            marginBottom: "0.5rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Today ({groupedEvents.today.length})
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          {groupedEvents.today.map(renderEventCard)}
                        </div>
                      </div>
                    )}

                    {/* This Week's Events */}
                    {groupedEvents.thisWeek.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "var(--color-text-light)",
                            marginBottom: "0.5rem",
                            textTransform: "uppercase",
                          }}
                        >
                          This Week ({groupedEvents.thisWeek.length})
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          {groupedEvents.thisWeek.map(renderEventCard)}
                        </div>
                      </div>
                    )}

                    {/* Later Events - Collapsible */}
                    {groupedEvents.later.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowLaterEvents(!showLaterEvents)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "var(--color-text-light)",
                            marginBottom: showLaterEvents ? "0.5rem" : "0",
                            textTransform: "uppercase",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <span
                            style={{
                              transform: showLaterEvents
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          >
                            ▶
                          </span>
                          Later ({groupedEvents.later.length})
                        </button>
                        {showLaterEvents && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            {groupedEvents.later.map(renderEventCard)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
      </div>

      {/* Quick Link to Family Dashboard */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <a
          href="/parent/dashboard"
          class="btn btn-secondary"
          style={{ fontSize: "0.875rem" }}
        >
          👨‍👩‍👧‍👦 View Family Dashboard
        </a>
      </div>

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <LiveActivityFeed
            initialActivity={recentActivity}
            familyId={family.id}
          />
        </div>
      )}

      {/* Edit Event Modal */}
      <AddEventModal
        isOpen={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        familyMembers={familyMembers}
        onSuccess={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          // Reload events
          if (activeParent) {
            loadParentEvents(activeParent.id);
          }
        }}
        editingEvent={editingEvent}
      />
    </>
  );
}

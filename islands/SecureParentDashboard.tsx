/**
 * Secure Parent Dashboard Component (Client-Side Active Parent Loading)
 * Same pattern as SecureKidDashboard - reads active parent from session storage
 */

import { useEffect, useState, useMemo } from "preact/hooks";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";
import { groupEventsByTimePeriod } from "../lib/utils/household.ts";
import AppHeader from "./AppHeader.tsx";

interface Props {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
}

export default function SecureParentDashboard({ family, familyMembers, recentActivity }: Props) {
  const [activeParent, setActiveParent] = useState<any>(null);
  const [parentChores, setParentChores] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [showLaterEvents, setShowLaterEvents] = useState(false);

  // Smart grouping for events: Today, This Week, Later
  const groupedEvents = useMemo(() => groupEventsByTimePeriod(upcomingEvents), [upcomingEvents]);

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
      const parent = familyMembers.find(member => 
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
      const response = await fetch('/api/kids/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

        // Show all events from today onwards (no upper limit - smart grouping in UI)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingParentEvents = parentEvents.filter((event: any) => {
          const eventDate = new Date(event.event_date + "T00:00:00");
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });

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
              const eventsWithChores = upcomingParentEvents.map((event: any) => ({
                ...event,
                linked_chores: chores.filter((c: any) => c.family_event_id === event.id),
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

  const handlePrepTaskToggle = async (eventId: string, taskId: string, done: boolean) => {
    if (!activeParent) return;

    setTogglingTaskId(taskId);

    try {
      // Optimistic update
      setUpcomingEvents(prev => prev.map(event => {
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
      }));

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
        setUpcomingEvents(prev => prev.map(event => ({
          ...event,
          linked_chores: (event.linked_chores || []).map((c: any) =>
            c.id === choreId ? { ...c, status: "completed" } : c
          ),
        })));
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

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "3rem",
        color: "var(--color-text-light)" 
      }}>
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
      {parentChores.length === 0 ? (
        /* Compact empty state - single line, no card */
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          color: "var(--color-text-light)",
          fontSize: "0.9rem",
        }}>
          <span style={{ fontSize: "1.25rem" }}>✅</span>
          <span>No chores today</span>
        </div>
      ) : (
        /* Chores list when has chores */
        <div class="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}>
            My Chores ({parentChores.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {parentChores.map((chore: any) => (
              <div
                key={chore.id}
                class="card"
                style={{
                  padding: "1.25rem",
                  border: "1px solid var(--color-border)",
                  backgroundColor: chore.status === "completed" ? "#f0f9ff" : "white",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>
                        {chore.chore_template?.icon || "📋"}
                      </span>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
                        {chore.chore_template?.name || "Chore"}
                      </h3>
                    </div>
                    
                    {chore.chore_template?.description && (
                      <p style={{ 
                        fontSize: "0.875rem", 
                        color: "var(--color-text-light)", 
                        margin: "0.5rem 0",
                        lineHeight: "1.4"
                      }}>
                        {chore.chore_template.description}
                      </p>
                    )}

                    {/* Due date and time */}
                    {chore.due_date && (
                      <div style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        marginBottom: "0.5rem"
                      }}>
                        📅 Due: {new Date(chore.due_date).toLocaleDateString()} at {new Date(chore.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    
                    <div style={{ 
                      fontSize: "1rem", 
                      color: "var(--color-primary)", 
                      fontWeight: "600" 
                    }}>
                      {chore.point_value} points
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: "1rem" }}>
                    <span
                      onClick={() => chore.status === "pending" && handleCompleteChore(chore.id)}
                      style={{
                        fontSize: "1.5rem",
                        color: chore.status === "completed" ? "var(--color-success)" : "var(--color-text)",
                        cursor: chore.status === "pending" ? "pointer" : "default",
                        display: "inline-block",
                        padding: "0.5rem",
                        opacity: completingChoreId === chore.id ? 0.5 : 1,
                      }}
                    >
                      {completingChoreId === chore.id ? "⏳" : (chore.status === "completed" ? "✓" : "☐")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming Up - Events with Smart Grouping */}
      {upcomingEvents.length > 0 && (
        <div class="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            📅 Coming Up
          </h2>

          {/* Helper to render event card */}
          {(() => {
            const renderEventCard = (event: any) => {
              const prepTasks = event.metadata?.prep_tasks || [];
              const myTasks = prepTasks.filter((t: any) => !t.assignee_id || t.assignee_id === activeParent.id);
              const myChores = event.linked_chores || [];
              const emoji = event.metadata?.emoji || "";

              const hasMissions = myTasks.length > 0 || myChores.length > 0;
              const totalTasks = myTasks.length + myChores.length;
              const doneTasks = myTasks.filter((t: any) => t.done).length + myChores.filter((c: any) => c.status === "completed").length;
              const allDone = totalTasks > 0 && doneTasks === totalTasks;

              return (
                <div
                  key={event.id}
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "var(--color-bg)",
                    borderRadius: "0.5rem",
                    borderLeft: `3px solid ${allDone ? "var(--color-success)" : "var(--color-primary)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: "600" }}>
                      {emoji}{emoji ? " " : ""}{event.title}
                    </span>
                    {hasMissions && (
                      <span style={{
                        fontSize: "0.75rem",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "1rem",
                        backgroundColor: allDone ? "var(--color-success)" : "var(--color-primary)",
                        color: "white",
                        fontWeight: "500",
                      }}>
                        {doneTasks}/{totalTasks}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
                    {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {event.schedule_data?.start_time && !event.schedule_data?.all_day && (
                      <> at {event.schedule_data.start_time}</>
                    )}
                  </div>
                  {hasMissions && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginBottom: "0.5rem" }}>
                        Your tasks:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        {/* Prep tasks */}
                        {myTasks.map((task: any) => (
                          <button
                            key={task.id}
                            onClick={() => handlePrepTaskToggle(event.id, task.id, !task.done)}
                            disabled={togglingTaskId === task.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: task.done ? "var(--color-bg)" : "white",
                              cursor: togglingTaskId === task.id ? "wait" : "pointer",
                              textAlign: "left",
                              width: "100%",
                              opacity: togglingTaskId === task.id ? 0.6 : 1,
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>
                              {togglingTaskId === task.id ? "⏳" : (task.done ? "✅" : "⬜")}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                fontSize: "0.875rem",
                                textDecoration: task.done ? "line-through" : "none",
                                color: task.done ? "var(--color-text-light)" : "var(--color-text)",
                              }}
                            >
                              {task.text}
                            </span>
                          </button>
                        ))}
                        {/* Linked chores */}
                        {myChores.map((chore: any) => (
                          <button
                            key={chore.id}
                            onClick={() => chore.status !== "completed" && handleCompleteEventChore(chore.id)}
                            disabled={completingChoreId === chore.id || chore.status === "completed"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: chore.status === "completed" ? "var(--color-bg)" : "white",
                              cursor: chore.status === "completed" ? "default" : (completingChoreId === chore.id ? "wait" : "pointer"),
                              textAlign: "left",
                              width: "100%",
                              opacity: completingChoreId === chore.id ? 0.6 : 1,
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>
                              {completingChoreId === chore.id ? "⏳" : (chore.status === "completed" ? "✅" : "⬜")}
                            </span>
                            <span style={{ fontSize: "1rem" }}>
                              {chore.chore_template?.icon || "📋"}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                fontSize: "0.875rem",
                                textDecoration: chore.status === "completed" ? "line-through" : "none",
                                color: chore.status === "completed" ? "var(--color-text-light)" : "var(--color-text)",
                              }}
                            >
                              {chore.chore_template?.name || "Task"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Today's Events */}
                {groupedEvents.today.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--color-primary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                      Today ({groupedEvents.today.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {groupedEvents.today.map(renderEventCard)}
                    </div>
                  </div>
                )}

                {/* This Week's Events */}
                {groupedEvents.thisWeek.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--color-text-light)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                      This Week ({groupedEvents.thisWeek.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
                      <span style={{ transform: showLaterEvents ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                      Later ({groupedEvents.later.length})
                    </button>
                    {showLaterEvents && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {groupedEvents.later.map(renderEventCard)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Quick Link to Family Dashboard */}
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <a
          href="/parent/dashboard"
          class="btn btn-secondary"
          style={{ fontSize: "0.875rem" }}
        >
          👨‍👩‍👧‍👦 View Family Dashboard
        </a>
      </div>
    </>
  );
}
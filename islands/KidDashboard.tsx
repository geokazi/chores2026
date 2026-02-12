/**
 * Kid Dashboard Island
 * Main interface for kids showing their status, chores, and family leaderboard
 */

import { useEffect, useMemo, useState } from "preact/hooks";
import ChoreList from "./ChoreList.tsx";
import LiveLeaderboard from "./LiveLeaderboard.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";
import EventMissionGroup from "./EventMissionGroup.tsx";
import AddEventModal from "./AddEventModal.tsx";
import AddPrepTasksModal from "./AddPrepTasksModal.tsx";
import PinEntryModal from "./PinEntryModal.tsx";
import WeeklyProgress from "./WeeklyProgress.tsx";
import EventCard from "./EventCard.tsx";
import {
  formatTime,
  groupChoresByEvent,
  groupEventsByTimePeriod,
  usePointsMode,
} from "../lib/utils/household.ts";
import { trackInteraction } from "../lib/utils/track-interaction.ts";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
}

interface ChoreAssignment {
  id: string;
  status: "pending" | "completed" | "verified" | "rejected";
  point_value: number;
  family_event_id?: string | null;
  family_event?: {
    id: string;
    title: string;
    emoji?: string;
    event_date: string;
    schedule_data?: {
      all_day?: boolean;
      start_time?: string;
    };
    metadata?: {
      emoji?: string;
    };
  } | null;
  source?: "manual" | "rotation";
  rotation_key?: string;
  rotation_preset?: string;
  rotation_date?: string;
  chore_template?: {
    name: string;
    description?: string;
    icon?: string;
  };
}

interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
}

interface LinkedChore {
  id: string;
  status: string;
  point_value: number;
  chore_template?: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
}

interface ThisWeekDay {
  date: string;
  dayName: string;
  done: boolean;
  points: number;
}

interface ThisWeekActivity {
  profileId: string;
  name: string;
  days: ThisWeekDay[];
  totalDone: number;
  totalPoints: number;
}

interface StreakData {
  profileId: string;
  name: string;
  currentStreak: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    all_day?: boolean;
    start_time?: string;
  };
  metadata?: {
    emoji?: string;
    prep_tasks?: PrepTask[];
  };
  linked_chores?: LinkedChore[];
  created_by_profile_id?: string;
}

interface Props {
  kid: FamilyMember;
  family: any;
  familyMembers: FamilyMember[];
  todaysChores: ChoreAssignment[];
  upcomingEvents?: UpcomingEvent[];
  recentActivity: any[];
  kidsCanCreateEvents?: boolean;
  kidPinRequired?: boolean;
  thisWeekActivity?: ThisWeekActivity[];
  streaks?: StreakData[];
  onChoreComplete?: (
    result: { points_earned: number; choreName: string },
  ) => void;
  onEventCreated?: () => void;
  onPrepTaskToggle?: (eventId: string, taskId: string, done: boolean) => void;
}

export default function KidDashboard({
  kid,
  family,
  familyMembers,
  todaysChores,
  upcomingEvents = [],
  recentActivity,
  kidsCanCreateEvents = false,
  kidPinRequired = false,
  thisWeekActivity = [],
  streaks = [],
  onChoreComplete,
  onEventCreated,
  onPrepTaskToggle,
}: Props) {
  const [chores, setChores] = useState(todaysChores);
  const [leaderboard, setLeaderboard] = useState(familyMembers);
  const [activity, setActivity] = useState(recentActivity);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showPrepTasksModal, setShowPrepTasksModal] = useState(false);
  const [selectedEventForPrep, setSelectedEventForPrep] = useState<
    UpcomingEvent | null
  >(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLaterEvents, setShowLaterEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UpcomingEvent | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  // Calendar added state (persisted in localStorage)
  const [calendarAddedIds, setCalendarAddedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("choregami_calendar_events");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Auto-expand "Today" events by default
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${
      String(now.getMonth() + 1).padStart(2, "0")
    }-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(() => {
    // Start with today's events expanded
    const todayEvents = upcomingEvents.filter((e) => e.event_date === todayStr);
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

  // Update chores when props change (after refresh)
  useEffect(() => {
    setChores(todaysChores);
  }, [todaysChores]);

  // Update expanded events when props change
  useEffect(() => {
    if (upcomingEvents.length > 0) {
      const todayEvents = upcomingEvents.filter((e) =>
        e.event_date === todayStr
      );
      setExpandedEvents((prev) => {
        const next = new Set(prev);
        todayEvents.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }, [upcomingEvents, todayStr]);

  // Group chores by event for mission display
  const groupedChores = useMemo(() => groupChoresByEvent(chores), [chores]);
  const showPoints = useMemo(() => usePointsMode(chores), [chores]);

  // Smart grouping for events: Today, This Week, Later
  const groupedEvents = useMemo(() => groupEventsByTimePeriod(upcomingEvents), [
    upcomingEvents,
  ]);

  // Filter weekly activity to show only this kid's data
  const kidWeeklyActivity = useMemo(
    () => thisWeekActivity.filter((a) => a.profileId === kid.id),
    [thisWeekActivity, kid.id],
  );
  const kidStreaks = useMemo(
    () => streaks.filter((s) => s.profileId === kid.id),
    [streaks, kid.id],
  );

  // Calculate kid's ranking and streak
  const sortedMembers = [...leaderboard]
    .filter((member) => member.role === "child")
    .sort((a, b) => b.current_points - a.current_points);

  const kidRank = sortedMembers.findIndex((member) => member.id === kid.id) + 1;
  const completedChores =
    chores.filter((chore) => chore.status === "completed").length;
  const totalChores = chores.length;

  const calculateStreak = (points: number) => {
    if (points > 800) return 5;
    if (points > 600) return 4;
    if (points > 400) return 3;
    if (points > 200) return 2;
    if (points > 100) return 1;
    return 0;
  };

  const getRankDisplay = () => {
    if (kidRank === 1) return "🏆 You're #1!";
    if (kidRank === 2) return "🥈 You're #2!";
    if (kidRank === 3) return "🥉 You're #3!";
    return `You're #${kidRank}`;
  };

  const getStreakDisplay = () => {
    const streak = calculateStreak(kid.current_points);
    if (streak > 0) {
      return `🔥${streak}`;
    }
    return "";
  };

  const handleChoreComplete = (
    choreId: string,
    result: { points_earned: number; choreName: string },
  ) => {
    // 1. Update local chore status immediately for responsive UI
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === choreId
          ? { ...chore, status: "completed" as const }
          : chore
      )
    );

    // 2. Update leaderboard points for this kid
    setLeaderboard((prev) =>
      prev.map((member) =>
        member.id === kid.id
          ? {
            ...member,
            current_points: member.current_points + result.points_earned,
          }
          : member
      )
    );

    // 3. Add new activity entry at the top
    const newActivity = {
      id: `local_${Date.now()}`,
      family_id: family.id,
      created_at: new Date().toISOString(),
      data: {
        v: 1,
        type: "chore_completed",
        actor_id: kid.id,
        actor_name: kid.name,
        icon: "✅",
        title: `${kid.name} completed "${result.choreName}"`,
        points: result.points_earned,
      },
    };
    setActivity((prev) => [newActivity, ...prev.slice(0, 9)]);

    // 4. Notify parent component
    if (onChoreComplete) {
      onChoreComplete(result);
    }

    console.log("🎉 Chore completed:", choreId, `+${result.points_earned} pts`);
  };

  const handleAddToCalendar = (event: UpcomingEvent) => {
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
        // Refresh events
        onEventCreated?.();
      } else {
        alert("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };

  const handlePrepTaskToggleWithState = async (
    eventId: string,
    taskId: string,
    done: boolean,
  ) => {
    setTogglingTaskId(taskId);
    try {
      await onPrepTaskToggle?.(eventId, taskId, done);
    } finally {
      setTogglingTaskId(null);
    }
  };

  return (
    <div>
      {/* Today's Chores - First, right after Family Goal */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "var(--color-text)",
          }}
        >
          Your Missions Today ({completedChores}/{totalChores})
        </h2>

        {/* Event Mission Groups - Show chores grouped by event first */}
        {groupedChores.events.map(({ event, chores: eventChores }) => (
          <EventMissionGroup
            key={event.id}
            event={event}
            chores={eventChores}
            kidId={kid.id}
            onChoreComplete={handleChoreComplete}
          />
        ))}

        {/* Regular Chores - Not linked to any event */}
        {groupedChores.unlinked.length > 0 && (
          <div
            style={{
              marginTop: groupedChores.events.length > 0 ? "1rem" : "0",
            }}
          >
            {groupedChores.events.length > 0 && (
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "var(--color-text)",
                }}
              >
                {showPoints ? "Earn Points Today" : "Other Tasks"}
              </h3>
            )}
            <ChoreList
              chores={groupedChores.unlinked}
              onChoreComplete={handleChoreComplete}
              kidId={kid.id}
              showPoints={showPoints}
            />
          </div>
        )}

        {chores.length === 0 && (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-text-light)" }}>
              🎉 No chores assigned for today!
            </p>
          </div>
        )}
      </div>

      {/* This Week Progress - Kid's day-by-day view */}
      {kidWeeklyActivity.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "var(--color-text)",
            }}
          >
            Last 7 Days
          </h2>
          <WeeklyProgress
            thisWeekActivity={kidWeeklyActivity}
            streaks={kidStreaks}
            singleKid={true}
          />
        </div>
      )}

      {/* Upcoming Events - Smart grouping: Today, This Week, Later */}
      {(upcomingEvents.length > 0 || kidsCanCreateEvents) && (
        <div class="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                margin: 0,
                color: "var(--color-text)",
              }}
            >
              📅 What's Next
            </h2>
            {kidsCanCreateEvents && (
              <button
                onClick={() => {
                  trackInteraction("kid_plan_event_click");
                  // If PIN required, show PIN modal first
                  if (kidPinRequired) {
                    setShowPinModal(true);
                  } else {
                    setShowAddEventModal(true);
                  }
                }}
                style={{
                  padding: "0.375rem 0.75rem",
                  backgroundColor: "var(--color-secondary-button)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                + Add Event
              </button>
            )}
          </div>

          {/* Render event using shared EventCard component */}
          {(() => {
            const renderEventCard = (event: UpcomingEvent) => {
              // Kids see overflow menu ONLY if they created the event
              const kidCreatedEvent = event.created_by_profile_id === kid.id;

              return (
                <div key={event.id} style={{ marginBottom: "0.5rem" }}>
                  <EventCard
                    event={event}
                    isExpanded={expandedEvents.has(event.id)}
                    onToggleExpand={() => toggleExpanded(event.id)}
                    onEdit={kidCreatedEvent
                      ? () => {
                        setEditingEvent(event);
                        setShowAddEventModal(true);
                      }
                      : undefined}
                    onDelete={kidCreatedEvent
                      ? () =>
                        handleDeleteEvent(event.id)
                      : undefined}
                    onTaskToggle={(taskId, done) =>
                      handlePrepTaskToggleWithState(event.id, taskId, done)}
                    onAddToCalendar={() =>
                      handleAddToCalendar(event)}
                    currentUserId={kid.id}
                    familyMembers={familyMembers}
                    showOverflowMenu={kidCreatedEvent}
                    showAddTask={false}
                    calendarAdded={calendarAddedIds.has(event.id)}
                    togglingTaskId={togglingTaskId || undefined}
                  />
                </div>
              );
            };

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

                {/* Empty state */}
                {upcomingEvents.length === 0 && (
                  <div
                    class="card"
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
                    {kidsCanCreateEvents && (
                      <button
                        onClick={() => {
                          trackInteraction("kid_plan_event_click");
                          if (kidPinRequired) {
                            setShowPinModal(true);
                          } else {
                            setShowAddEventModal(true);
                          }
                        }}
                        style={{
                          marginTop: "0.75rem",
                          background: "none",
                          border: "none",
                          color: "var(--color-primary)",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        + Add Event
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Kid's Status Card - Above leaderboard */}
      <div class="card" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        {showPoints && (
          <>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              {getRankDisplay()}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "var(--color-primary)",
                marginBottom: "0.5rem",
              }}
            >
              {kid.current_points} pts {getStreakDisplay()}
            </div>
          </>
        )}
        {totalChores > 0 && (
          <div
            style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}
          >
            Today's Progress: {completedChores}/{totalChores}{" "}
            {showPoints ? "chores" : "tasks"} ⭐
          </div>
        )}
      </div>

      {/* Family Leaderboard */}
      <div style={{ marginBottom: "1.5rem" }}>
        <LiveLeaderboard
          familyMembers={leaderboard}
          currentKidId={kid.id}
          familyId={family.id}
        />
      </div>

      {/* Recent Activity Feed */}
      <div style={{ marginBottom: "1.5rem" }}>
        <LiveActivityFeed
          initialActivity={activity}
          familyId={family.id}
        />
      </div>

      {/* Family Reports Link */}
      <div style={{ textAlign: "center" }}>
        <a
          href="/reports"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--color-secondary-button)",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          📊 See Family Progress
        </a>
      </div>

      {/* Kid Event Creation/Edit Modal */}
      {kidsCanCreateEvents && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => {
            setShowAddEventModal(false);
            setEditingEvent(null);
          }}
          familyMembers={familyMembers}
          onSuccess={() => {
            setShowAddEventModal(false);
            setEditingEvent(null);
            onEventCreated?.();
          }}
          creatorId={kid.id}
          editingEvent={editingEvent}
        />
      )}

      {/* PIN Entry Modal (when kid PIN is required for event creation) */}
      {kidPinRequired && showPinModal && (
        <PinEntryModal
          kid={kid}
          onSuccess={() => {
            setShowPinModal(false);
            setShowAddEventModal(true);
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {/* Add Prep Tasks Modal for kids */}
      <AddPrepTasksModal
        isOpen={showPrepTasksModal}
        onClose={() => {
          setShowPrepTasksModal(false);
          setSelectedEventForPrep(null);
        }}
        event={selectedEventForPrep}
        familyMembers={familyMembers}
        onSuccess={() => {
          setShowPrepTasksModal(false);
          setSelectedEventForPrep(null);
          onEventCreated?.(); // Refresh events to show new tasks
        }}
      />
    </div>
  );
}

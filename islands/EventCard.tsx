/**
 * EventCard Component - Progressive Disclosure UI
 * Shared across all dashboards: EventsList, ParentDashboard, KidDashboard
 *
 * Features:
 * - Collapsed by default (~60px) showing title, participants, date, overflow menu
 * - Expanded on tap: shows tasks, "+ Add task", "Add to Calendar"
 * - Overflow menu (⋮) for Edit/Delete actions
 * - Swipe left to reveal quick actions
 * - Smooth CSS transitions
 */

import { useEffect, useRef, useState } from "preact/hooks";
import { formatTime } from "../lib/utils/household.ts";

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
  assigned_to_profile_id?: string;
  chore_template?: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
}

interface EventData {
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
  participants?: string[];
  linked_chores?: LinkedChore[];
  created_by_profile_id?: string;
}

interface EventCardProps {
  event: EventData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddTask?: (type: "prep" | "chore") => void;
  onTaskToggle?: (taskId: string, done: boolean) => void;
  onPrepTaskEdit?: (taskId: string) => void;
  onPrepTaskDelete?: (taskId: string) => void;
  onChoreComplete?: (choreId: string) => void;
  onChoreDelete?: (choreId: string) => void;
  onAddToCalendar?: () => void;
  currentUserId?: string;
  familyMembers?: Array<{ id: string; name: string }>;
  showOverflowMenu?: boolean;
  showAddTask?: boolean;
  calendarAdded?: boolean;
  togglingTaskId?: string;
  completingChoreId?: string;
}

export default function EventCard({
  event,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddTask,
  onTaskToggle,
  onPrepTaskEdit,
  onPrepTaskDelete,
  onChoreComplete,
  onChoreDelete,
  onAddToCalendar,
  currentUserId,
  familyMembers = [],
  showOverflowMenu = true,
  showAddTask = true,
  calendarAdded = false,
  togglingTaskId,
  completingChoreId,
}: EventCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addTaskChoice, setAddTaskChoice] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  // Track which item's mini menu is open (prep task or chore)
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      // Close item menus when clicking outside
      const target = e.target as HTMLElement;
      if (!target.closest("[data-item-menu]")) {
        setOpenItemMenuId(null);
      }
    };
    if (menuOpen || openItemMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen, openItemMenuId]);

  // Date formatting
  const eventDate = new Date(event.event_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDateOnly = new Date(event.event_date + "T00:00:00");
  eventDateOnly.setHours(0, 0, 0, 0);

  let dateLabel: string;
  if (eventDateOnly.getTime() === today.getTime()) {
    dateLabel = "Today";
  } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
    dateLabel = "Tomorrow";
  } else {
    dateLabel = eventDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const timeStr = event.schedule_data?.start_time
    ? formatTime(event.schedule_data.start_time)
    : event.schedule_data?.all_day
    ? "All day"
    : "";

  // Participants label
  const getParticipantsLabel = () => {
    if (!event.participants || event.participants.length === 0) {
      return "Everyone";
    }
    if (event.participants.length === familyMembers.length) {
      return "Everyone";
    }
    const names = event.participants
      .map((id) => familyMembers.find((m) => m.id === id)?.name || "")
      .filter(Boolean);
    if (names.length <= 2) {
      return names.join(" & ");
    }
    return `${names[0]} +${names.length - 1}`;
  };

  // Get assignee name if different from event participants
  const getAssigneeLabel = (assigneeId?: string): string | null => {
    if (!assigneeId) return null;
    // If event has participants, check if assignee is one of them
    if (event.participants && event.participants.length > 0) {
      if (event.participants.includes(assigneeId)) {
        return null; // Assignee is a participant, don't show
      }
    }
    // Find the name
    const member = familyMembers.find((m) => m.id === assigneeId);
    return member?.name || null;
  };

  // Tasks for current user (if currentUserId is undefined, show all tasks)
  const prepTasks = event.metadata?.prep_tasks || [];
  const myPrepTasks = currentUserId
    ? prepTasks.filter(
      (task) => !task.assignee_id || task.assignee_id === currentUserId,
    )
    : prepTasks; // Show all tasks when no user context (e.g., EventsList parent view)
  const linkedChores = event.linked_chores || [];

  // Task progress
  const totalTasks = myPrepTasks.length + linkedChores.length;
  const doneTasks = myPrepTasks.filter((t) => t.done).length +
    linkedChores.filter((c) => c.status === "completed").length;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  // Swipe gesture handlers
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!swiping) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    // Only allow left swipe (reveal actions), max 80px
    if (diff > 0 && diff <= 80) {
      setSwipeOffset(diff);
    } else if (diff < 0) {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    // Snap to either open (80px) or closed (0px)
    if (swipeOffset > 40) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  };

  // Card click handler (tap to expand, but not on buttons)
  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle if clicking on buttons or menu
    if (target.closest("button") || target.closest("[data-menu]")) {
      return;
    }
    onToggleExpand();
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Swipe action buttons (revealed on swipe left) */}
      {showOverflowMenu && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
          }}
        >
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                padding: "0.5rem",
                backgroundColor: "var(--color-secondary)",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: "0.5rem",
                backgroundColor: "var(--color-warning)",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              🗑️
            </button>
          )}
        </div>
      )}

      {/* Main card */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          padding: "0.75rem",
          backgroundColor: "var(--color-card)",
          borderRadius: "0.5rem",
          borderLeft: `4px solid ${
            allDone ? "var(--color-success)" : "var(--color-primary)"
          }`,
          cursor: "pointer",
          transform: `translateX(-${swipeOffset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Collapsed View (always visible) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Expand/collapse chevron */}
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-light)",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease-out",
              flexShrink: 0,
            }}
          >
            ▶
          </span>

          {/* Title and metadata */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: "600",
                marginBottom: "0.125rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {event.title}
            </div>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-light)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span>👥 {getParticipantsLabel()}</span>
              <span>•</span>
              <span>{dateLabel}{timeStr && ` at ${timeStr}`}</span>
            </div>
          </div>

          {/* Task progress badge */}
          {totalTasks > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.125rem 0.5rem",
                borderRadius: "1rem",
                backgroundColor: allDone
                  ? "var(--color-success)"
                  : "var(--color-primary)",
                color: "white",
                fontWeight: "500",
                flexShrink: 0,
              }}
            >
              {doneTasks}/{totalTasks}
            </span>
          )}

          {/* Overflow menu button */}
          {showOverflowMenu && (
            <div data-menu style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                style={{
                  padding: "0.5rem",
                  backgroundColor: "transparent",
                  border: "none",
                  fontSize: "1rem",
                  cursor: "pointer",
                  color: "var(--color-text-light)",
                  borderRadius: "0.25rem",
                  minWidth: "32px",
                  minHeight: "32px",
                }}
              >
                ⋮
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    backgroundColor: "var(--color-card)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 100,
                    minWidth: "140px",
                    overflow: "hidden",
                  }}
                >
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit();
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        backgroundColor: "transparent",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        color: "var(--color-text)",
                      }}
                      onMouseEnter={(
                        e,
                      ) => (e.currentTarget.style.backgroundColor =
                        "var(--color-bg)")}
                      onMouseLeave={(
                        e,
                      ) => (e.currentTarget.style.backgroundColor =
                        "transparent")}
                    >
                      Edit Event
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "var(--color-border)",
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          if (confirm("Delete this event?")) {
                            onDelete();
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "0.75rem 1rem",
                          backgroundColor: "transparent",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          color: "var(--color-warning)",
                        }}
                        onMouseEnter={(
                          e,
                        ) => (e.currentTarget.style.backgroundColor =
                          "var(--color-bg)")}
                        onMouseLeave={(
                          e,
                        ) => (e.currentTarget.style.backgroundColor =
                          "transparent")}
                      >
                        <span>Delete Event</span>
                        <span>🗑️</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded View (with CSS transition) */}
        <div
          style={{
            maxHeight: isExpanded ? "500px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.3s ease-out, opacity 0.2s ease-out",
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <div
            style={{
              paddingTop: "0.75rem",
              marginTop: "0.75rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            {/* Tasks Section */}
            {(myPrepTasks.length > 0 || linkedChores.length > 0) && (
              <div style={{ marginBottom: "0.75rem" }}>
                {/* Prep Tasks */}
                {myPrepTasks.length > 0 && (
                  <div
                    style={{
                      marginBottom: linkedChores.length > 0 ? "0.5rem" : 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: "600",
                        color: "var(--color-text-light)",
                        marginBottom: "0.375rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      PREP ({myPrepTasks.length}){" "}
                      <span
                        style={{
                          fontWeight: "400",
                          textTransform: "lowercase",
                          letterSpacing: "normal",
                        }}
                      >
                        • checklist
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      {myPrepTasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            position: "relative",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskToggle?.(task.id, !task.done);
                            }}
                            disabled={togglingTaskId === task.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: task.done ? "var(--color-bg)" : "white",
                              cursor: togglingTaskId === task.id
                                ? "wait"
                                : "pointer",
                              textAlign: "left",
                              flex: 1,
                              opacity: togglingTaskId === task.id ? 0.6 : 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>
                                {togglingTaskId === task.id
                                  ? "⏳"
                                  : (task.done ? "☑" : "☐")}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.875rem",
                                  textDecoration: task.done
                                    ? "line-through"
                                    : "none",
                                  color: task.done
                                    ? "var(--color-text-light)"
                                    : "var(--color-text)",
                                }}
                              >
                                {task.text}
                              </span>
                              {/* Show assignee if different from event participants */}
                              {getAssigneeLabel(task.assignee_id) && (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-text-light)",
                                    marginLeft: "0.5rem",
                                    fontStyle: "italic",
                                  }}
                                >
                                  → {getAssigneeLabel(task.assignee_id)}
                                </span>
                              )}
                            </div>
                          </button>
                          {/* Mini overflow menu for prep task */}
                          {(onPrepTaskEdit || onPrepTaskDelete) && (
                            <div data-item-menu style={{ position: "relative" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(
                                    openItemMenuId === `prep-${task.id}`
                                      ? null
                                      : `prep-${task.id}`,
                                  );
                                }}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  fontSize: "1rem",
                                  cursor: "pointer",
                                  color: "var(--color-text-light)",
                                  borderRadius: "0.25rem",
                                  minWidth: "28px",
                                  minHeight: "28px",
                                }}
                              >
                                ⋮
                              </button>
                              {openItemMenuId === `prep-${task.id}` && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "100%",
                                    backgroundColor: "var(--color-card)",
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    zIndex: 101,
                                    minWidth: "100px",
                                    overflow: "hidden",
                                  }}
                                >
                                  {onPrepTaskEdit && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenItemMenuId(null);
                                        onPrepTaskEdit(task.id);
                                      }}
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "0.5rem 0.75rem",
                                        backgroundColor: "transparent",
                                        border: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "0.8125rem",
                                        color: "var(--color-text)",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "var(--color-bg)")}
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "transparent")}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {onPrepTaskDelete && (
                                    <>
                                      {onPrepTaskEdit && (
                                        <div
                                          style={{
                                            height: "1px",
                                            backgroundColor:
                                              "var(--color-border)",
                                          }}
                                        />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenItemMenuId(null);
                                          if (
                                            confirm("Delete this prep task?")
                                          ) {
                                            onPrepTaskDelete(task.id);
                                          }
                                        }}
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          padding: "0.5rem 0.75rem",
                                          backgroundColor: "transparent",
                                          border: "none",
                                          textAlign: "left",
                                          cursor: "pointer",
                                          fontSize: "0.8125rem",
                                          color: "var(--color-warning)",
                                        }}
                                        onMouseEnter={(e) =>
                                          (e.currentTarget.style
                                            .backgroundColor =
                                              "var(--color-bg)")}
                                        onMouseLeave={(e) =>
                                          (e.currentTarget.style
                                            .backgroundColor = "transparent")}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Chores */}
                {linkedChores.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: "600",
                        color: "var(--color-text-light)",
                        marginBottom: "0.375rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      CHORES ({linkedChores.length}){" "}
                      <span
                        style={{
                          fontWeight: "400",
                          textTransform: "lowercase",
                          letterSpacing: "normal",
                        }}
                      >
                        • earns points
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      {linkedChores.map((chore) => (
                        <div
                          key={chore.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            position: "relative",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chore.status !== "completed") {
                                onChoreComplete?.(chore.id);
                              }
                            }}
                            disabled={completingChoreId === chore.id ||
                              chore.status === "completed"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: chore.status === "completed"
                                ? "var(--color-bg)"
                                : "white",
                              cursor: chore.status === "completed"
                                ? "default"
                                : (completingChoreId === chore.id
                                  ? "wait"
                                  : "pointer"),
                              textAlign: "left",
                              flex: 1,
                              opacity: completingChoreId === chore.id ? 0.6 : 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>
                                {completingChoreId === chore.id
                                  ? "⏳"
                                  : (chore.status === "completed" ? "☑" : "☐")}
                              </span>
                              <span style={{ fontSize: "1rem" }}>
                                {chore.chore_template?.icon || "📋"}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.875rem",
                                  textDecoration: chore.status === "completed"
                                    ? "line-through"
                                    : "none",
                                  color: chore.status === "completed"
                                    ? "var(--color-text-light)"
                                    : "var(--color-text)",
                                }}
                              >
                                {chore.chore_template?.name || "Task"}
                              </span>
                              {/* Show assignee if different from event participants */}
                              {getAssigneeLabel(chore.assigned_to_profile_id) && (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-text-light)",
                                    marginLeft: "0.5rem",
                                    fontStyle: "italic",
                                  }}
                                >
                                  ({getAssigneeLabel(chore.assigned_to_profile_id)})
                                </span>
                              )}
                            </div>
                            {chore.point_value > 0 && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--color-text-light)",
                                }}
                              >
                                → {chore.point_value} pts
                              </span>
                            )}
                          </button>
                          {/* Mini overflow menu for chore */}
                          {onChoreDelete && (
                            <div data-item-menu style={{ position: "relative" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(
                                    openItemMenuId === `chore-${chore.id}`
                                      ? null
                                      : `chore-${chore.id}`,
                                  );
                                }}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  fontSize: "1rem",
                                  cursor: "pointer",
                                  color: "var(--color-text-light)",
                                  borderRadius: "0.25rem",
                                  minWidth: "28px",
                                  minHeight: "28px",
                                }}
                              >
                                ⋮
                              </button>
                              {openItemMenuId === `chore-${chore.id}` && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "100%",
                                    backgroundColor: "var(--color-card)",
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    zIndex: 101,
                                    minWidth: "100px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenItemMenuId(null);
                                      if (
                                        confirm(
                                          "Remove this chore from the event?",
                                        )
                                      ) {
                                        onChoreDelete(chore.id);
                                      }
                                    }}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "0.5rem 0.75rem",
                                      backgroundColor: "transparent",
                                      border: "none",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      fontSize: "0.8125rem",
                                      color: "var(--color-warning)",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "var(--color-bg)")}
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "transparent")}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state for tasks */}
            {myPrepTasks.length === 0 && linkedChores.length === 0 && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-light)",
                  margin: "0 0 0.75rem 0",
                  fontStyle: "italic",
                }}
              >
                No tasks yet
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {/* Add Task button with inline choice */}
              {showAddTask && onAddTask && (
                <>
                  {!addTaskChoice
                    ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddTaskChoice(true);
                        }}
                        style={{
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "transparent",
                          border: "1px solid var(--color-primary)",
                          borderRadius: "0.375rem",
                          color: "var(--color-primary)",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        + Add task
                      </button>
                    )
                    : (
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddTaskChoice(false);
                            onAddTask("prep");
                          }}
                          style={{
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--color-primary)",
                            border: "none",
                            borderRadius: "0.375rem",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            lineHeight: "1.2",
                          }}
                        >
                          <span>Prep</span>
                          <span style={{ fontSize: "0.625rem", opacity: 0.8 }}>
                            checklist
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddTaskChoice(false);
                            onAddTask("chore");
                          }}
                          style={{
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--color-secondary)",
                            border: "none",
                            borderRadius: "0.375rem",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            lineHeight: "1.2",
                          }}
                        >
                          <span>Chore</span>
                          <span style={{ fontSize: "0.625rem", opacity: 0.8 }}>
                            earns pts
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddTaskChoice(false);
                          }}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "transparent",
                            border: "none",
                            color: "var(--color-text-light)",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                </>
              )}

              {/* Add to Calendar button */}
              {onAddToCalendar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCalendar();
                  }}
                  disabled={calendarAdded}
                  style={{
                    padding: "0.5rem 0.75rem",
                    backgroundColor: calendarAdded
                      ? "var(--color-bg)"
                      : "var(--color-primary)",
                    border: "none",
                    borderRadius: "0.375rem",
                    color: calendarAdded ? "var(--color-success)" : "white",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: calendarAdded ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  {calendarAdded
                    ? <>✓ In your calendar</>
                    : <>📅 Add to Calendar</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

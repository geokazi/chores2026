/**
 * Household Utilities
 * Event grouping and points mode detection for kid dashboard
 */

export interface FamilyEvent {
  id: string;
  title: string;
  emoji?: string;
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
}

export interface ChoreAssignment {
  id: string;
  status: "pending" | "completed" | "verified" | "rejected";
  point_value: number;
  family_event_id?: string | null;
  family_event?: FamilyEvent | null;
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

export interface GroupedChores {
  events: Array<{
    event: FamilyEvent;
    chores: ChoreAssignment[];
  }>;
  unlinked: ChoreAssignment[];
}

/**
 * Groups chores by their linked family event
 * Returns event groups with their chores, plus unlinked chores
 */
export function groupChoresByEvent(chores: ChoreAssignment[]): GroupedChores {
  const eventMap = new Map<string, { event: FamilyEvent; chores: ChoreAssignment[] }>();
  const unlinked: ChoreAssignment[] = [];

  for (const chore of chores) {
    if (chore.family_event_id && chore.family_event) {
      if (!eventMap.has(chore.family_event_id)) {
        eventMap.set(chore.family_event_id, {
          event: chore.family_event,
          chores: [],
        });
      }
      eventMap.get(chore.family_event_id)!.chores.push(chore);
    } else {
      unlinked.push(chore);
    }
  }

  // Sort events by date/time
  const events = Array.from(eventMap.values()).sort((a, b) => {
    const dateA = new Date(a.event.event_date);
    const dateB = new Date(b.event.event_date);
    return dateA.getTime() - dateB.getTime();
  });

  return { events, unlinked };
}

/**
 * Determines if a family uses points mode
 * Returns true if any chore has points > 0
 */
export function usePointsMode(chores: ChoreAssignment[]): boolean {
  return chores.some((c) => c.point_value > 0);
}

/**
 * Format time string (HH:MM) to display format (12-hour)
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Smart grouping for events by time period
 * Groups events into: Today, This Week, Later
 */
export interface GroupedEvents {
  today: FamilyEvent[];
  thisWeek: FamilyEvent[];
  later: FamilyEvent[];
}

export function groupEventsByTimePeriod<T extends { event_date: string }>(events: T[]): {
  today: T[];
  thisWeek: T[];
  later: T[];
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const result = {
    today: [] as T[],
    thisWeek: [] as T[],
    later: [] as T[],
  };

  for (const event of events) {
    const eventDate = new Date(event.event_date + "T00:00:00");
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) {
      result.today.push(event);
    } else if (eventDate > today && eventDate < weekFromNow) {
      result.thisWeek.push(event);
    } else if (eventDate >= weekFromNow) {
      result.later.push(event);
    }
    // Past events are filtered out
  }

  return result;
}

/**
 * Format event date for display
 */
export function formatEventDate(event: FamilyEvent): string {
  const date = new Date(event.event_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDateOnly = new Date(event.event_date + "T00:00:00");
  eventDateOnly.setHours(0, 0, 0, 0);

  let dateStr: string;
  if (eventDateOnly.getTime() === today.getTime()) {
    dateStr = "Today";
  } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
    dateStr = "Tomorrow";
  } else {
    dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const time = event.schedule_data?.start_time;
  if (time && !event.schedule_data?.all_day) {
    return `${dateStr} at ${formatTime(time)}`;
  }
  if (event.schedule_data?.all_day) {
    return `${dateStr} (All day)`;
  }
  return dateStr;
}

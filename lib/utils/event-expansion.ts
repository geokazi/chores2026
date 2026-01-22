/**
 * Event Expansion Utility
 * Expands multi-day and recurring events into display instances for calendar/list views.
 *
 * Design: Pure JSONB approach - no database columns for end_date or recurrence.
 * - Multi-day: Uses schedule_data.duration_days
 * - Recurring: Uses recurrence_data.pattern and recurrence_data.until_date
 */

export interface FamilyEvent {
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
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExpandedEvent extends FamilyEvent {
  display_date: string;
  display_suffix?: string;
  is_recurring_instance?: boolean;
  is_multi_day_instance?: boolean;
  day_index?: number;
  total_days?: number;
}

/**
 * Get the interval in days for a recurrence pattern
 */
function getIntervalDays(pattern: string): number {
  switch (pattern) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30; // Simplified - for exact monthly, use date math
    default:
      return 7;
  }
}

/**
 * Add days to a date string (YYYY-MM-DD format)
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Expand events for a date range, generating instances for multi-day and recurring events.
 *
 * @param events - Array of events from database
 * @param queryStartDate - Start of query range (YYYY-MM-DD)
 * @param queryEndDate - End of query range (YYYY-MM-DD)
 * @returns Array of expanded events with display_date and optional display_suffix
 */
export function expandEventsForDateRange(
  events: FamilyEvent[],
  queryStartDate: string,
  queryEndDate: string
): ExpandedEvent[] {
  const expanded: ExpandedEvent[] = [];

  for (const event of events) {
    const eventDate = event.event_date;
    const durationDays = event.schedule_data?.duration_days || 1;
    const isRecurring = event.recurrence_data?.is_recurring === true;
    const pattern = event.recurrence_data?.pattern;
    const untilDate = event.recurrence_data?.until_date;

    // Case 1: Multi-day event (duration > 1)
    if (durationDays > 1) {
      for (let dayIndex = 0; dayIndex < durationDays; dayIndex++) {
        const displayDate = addDays(eventDate, dayIndex);

        // Check if this day falls within query range
        if (compareDates(displayDate, queryStartDate) >= 0 &&
            compareDates(displayDate, queryEndDate) <= 0) {
          expanded.push({
            ...event,
            display_date: displayDate,
            display_suffix: ` (Day ${dayIndex + 1} of ${durationDays})`,
            is_multi_day_instance: true,
            day_index: dayIndex + 1,
            total_days: durationDays,
          });
        }
      }
    }
    // Case 2: Recurring event
    else if (isRecurring && pattern) {
      const intervalDays = getIntervalDays(pattern);
      let currentDate = eventDate;
      const effectiveUntil = untilDate || queryEndDate; // If no until_date, use query end

      // Generate occurrences
      while (compareDates(currentDate, effectiveUntil) <= 0 &&
             compareDates(currentDate, queryEndDate) <= 0) {
        // Only include if within query range
        if (compareDates(currentDate, queryStartDate) >= 0) {
          expanded.push({
            ...event,
            display_date: currentDate,
            is_recurring_instance: true,
          });
        }
        currentDate = addDays(currentDate, intervalDays);
      }
    }
    // Case 3: Single event (no multi-day, no recurrence)
    else {
      // Only include if within query range
      if (compareDates(eventDate, queryStartDate) >= 0 &&
          compareDates(eventDate, queryEndDate) <= 0) {
        expanded.push({
          ...event,
          display_date: eventDate,
        });
      }
    }
  }

  // Sort by display_date, then by start_time
  return expanded.sort((a, b) => {
    const dateCompare = compareDates(a.display_date, b.display_date);
    if (dateCompare !== 0) return dateCompare;

    // Same date - sort by start_time (all-day events first, then by time)
    const aTime = a.schedule_data?.start_time || "";
    const bTime = b.schedule_data?.start_time || "";
    const aAllDay = a.schedule_data?.all_day || false;
    const bAllDay = b.schedule_data?.all_day || false;

    if (aAllDay && !bAllDay) return -1;
    if (!aAllDay && bAllDay) return 1;
    return aTime.localeCompare(bTime);
  });
}

/**
 * Check if an event is multi-day
 */
export function isMultiDayEvent(event: FamilyEvent): boolean {
  return (event.schedule_data?.duration_days || 1) > 1;
}

/**
 * Check if an event is recurring
 */
export function isRecurringEvent(event: FamilyEvent): boolean {
  return event.recurrence_data?.is_recurring === true &&
         !!event.recurrence_data?.pattern;
}

/**
 * Get human-readable recurrence description
 */
export function getRecurrenceDescription(event: FamilyEvent): string {
  if (!isRecurringEvent(event)) return "";

  const pattern = event.recurrence_data?.pattern;
  const untilDate = event.recurrence_data?.until_date;

  let desc = "";
  switch (pattern) {
    case "weekly":
      desc = "Repeats weekly";
      break;
    case "biweekly":
      desc = "Repeats every 2 weeks";
      break;
    case "monthly":
      desc = "Repeats monthly";
      break;
    default:
      desc = "Repeats";
  }

  if (untilDate) {
    const date = new Date(untilDate + "T00:00:00");
    desc += ` until ${date.toLocaleDateString()}`;
  }

  return desc;
}

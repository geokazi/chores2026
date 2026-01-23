/**
 * ICS/iCalendar Generator Utility
 * Generates RFC 5545 compliant ICS files for family events.
 */

export interface EventData {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
    duration_days?: number;
  } | null;
  recurrence_data?: {
    is_recurring?: boolean;
    pattern?: string;
    until_date?: string;
  } | null;
  participants?: string[] | null;
  metadata?: {
    emoji?: string;
  } | null;
}

export function generateICS(event: EventData): string {
  const scheduleData = event.schedule_data;
  const recurrenceData = event.recurrence_data;
  const participants = event.participants;

  const eventDate = event.event_date;
  const startTime = scheduleData?.start_time;
  const endTime = scheduleData?.end_time;
  const allDay = scheduleData?.all_day;
  const durationDays = scheduleData?.duration_days;

  let dtStart: string;
  let dtEnd: string;

  if (allDay || !startTime) {
    const dateStr = eventDate.replace(/-/g, "");
    dtStart = `DTSTART;VALUE=DATE:${dateStr}`;
    if (durationDays && durationDays > 1) {
      const endDate = new Date(eventDate + "T00:00:00");
      endDate.setDate(endDate.getDate() + durationDays);
      const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
      dtEnd = `DTEND;VALUE=DATE:${endStr}`;
    } else {
      const nextDay = new Date(eventDate + "T00:00:00");
      nextDay.setDate(nextDay.getDate() + 1);
      const endStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
      dtEnd = `DTEND;VALUE=DATE:${endStr}`;
    }
  } else {
    const dateStr = eventDate.replace(/-/g, "");
    const startFormatted = startTime.replace(":", "") + "00";
    dtStart = `DTSTART;TZID=Africa/Nairobi:${dateStr}T${startFormatted}`;

    if (endTime) {
      const endFormatted = endTime.replace(":", "") + "00";
      dtEnd = `DTEND;TZID=Africa/Nairobi:${dateStr}T${endFormatted}`;
    } else {
      const [h, m] = startTime.split(":").map(Number);
      const endH = String(h + 1).padStart(2, "0");
      const endM = String(m).padStart(2, "0");
      dtEnd = `DTEND;TZID=Africa/Nairobi:${dateStr}T${endH}${endM}00`;
    }
  }

  let rrule = "";
  if (recurrenceData?.is_recurring && recurrenceData?.pattern) {
    const freqMap: Record<string, string> = {
      weekly: "WEEKLY",
      biweekly: "WEEKLY;INTERVAL=2",
      monthly: "MONTHLY",
    };
    const freq = freqMap[recurrenceData.pattern] || "WEEKLY";
    rrule = `RRULE:FREQ=${freq}`;
    if (recurrenceData.until_date) {
      const until = recurrenceData.until_date.replace(/-/g, "");
      rrule += `;UNTIL=${until}T235959Z`;
    }
    rrule += "\n";
  }

  const title = event.title;
  const description = participants?.length
    ? `Participants: ${participants.join(", ")}`
    : "";
  const emoji = event.metadata?.emoji || "";

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChoreGami//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    "TZID:Africa/Nairobi",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:EAT",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    dtStart,
    dtEnd,
    rrule ? rrule.trim() : null,
    `SUMMARY:${emoji}${emoji ? " " : ""}${title}`,
    description ? `DESCRIPTION:${description}` : null,
    `UID:${event.id}@choregami.app`,
    `DTSTAMP:${now}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n") + "\r\n";
}

/**
 * ICS/iCalendar Generator Utility
 * Generates RFC 5545 compliant ICS files for family events.
 * Supports any IANA timezone (auto-detected from user profile).
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

/** Get UTC offset in minutes for a timezone at a given date */
function getUtcOffsetMinutes(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 60_000;
}

/** Format offset minutes as ICS offset string (+0300, -0500) */
function formatIcsOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}${m}`;
}

/** Get timezone abbreviation (EST, PST, EAT, etc.) */
function getTzAbbrev(timezone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value || timezone;
}

/** Generate VTIMEZONE block for any IANA timezone */
function generateVTimezone(timezone: string, eventDate: string): string[] {
  const year = parseInt(eventDate.slice(0, 4));

  // Check offsets in January and July to detect DST
  const jan = new Date(year, 0, 15);
  const jul = new Date(year, 6, 15);
  const janOffset = getUtcOffsetMinutes(timezone, jan);
  const julOffset = getUtcOffsetMinutes(timezone, jul);

  const lines = [
    "BEGIN:VTIMEZONE",
    `TZID:${timezone}`,
  ];

  if (janOffset === julOffset) {
    // No DST — single STANDARD section
    lines.push(
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      `TZOFFSETFROM:${formatIcsOffset(janOffset)}`,
      `TZOFFSETTO:${formatIcsOffset(janOffset)}`,
      `TZNAME:${getTzAbbrev(timezone, jan)}`,
      "END:STANDARD",
    );
  } else {
    // Has DST — determine which is standard vs daylight
    const stdOffset = Math.min(janOffset, julOffset);
    const dstOffset = Math.max(janOffset, julOffset);
    const stdInJan = janOffset === stdOffset;

    const stdDate = stdInJan ? jan : jul;
    const dstDate = stdInJan ? jul : jan;

    lines.push(
      "BEGIN:STANDARD",
      `DTSTART:19700101T${stdInJan ? "020000" : "020000"}`,
      `TZOFFSETFROM:${formatIcsOffset(dstOffset)}`,
      `TZOFFSETTO:${formatIcsOffset(stdOffset)}`,
      `TZNAME:${getTzAbbrev(timezone, stdDate)}`,
      "END:STANDARD",
      "BEGIN:DAYLIGHT",
      `DTSTART:19700101T020000`,
      `TZOFFSETFROM:${formatIcsOffset(stdOffset)}`,
      `TZOFFSETTO:${formatIcsOffset(dstOffset)}`,
      `TZNAME:${getTzAbbrev(timezone, dstDate)}`,
      "END:DAYLIGHT",
    );
  }

  lines.push("END:VTIMEZONE");
  return lines;
}

export function generateICS(event: EventData, timezone = "UTC"): string {
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
    dtStart = `DTSTART;TZID=${timezone}:${dateStr}T${startFormatted}`;

    if (endTime) {
      const endFormatted = endTime.replace(":", "") + "00";
      dtEnd = `DTEND;TZID=${timezone}:${dateStr}T${endFormatted}`;
    } else {
      const [h, m] = startTime.split(":").map(Number);
      const endH = String(h + 1).padStart(2, "0");
      const endM = String(m).padStart(2, "0");
      dtEnd = `DTEND;TZID=${timezone}:${dateStr}T${endH}${endM}00`;
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

  const vtimezone = (!allDay && startTime) ? generateVTimezone(timezone, eventDate) : [];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChoreGami//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${timezone}`,
    ...vtimezone,
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

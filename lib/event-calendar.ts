export type CalendarEventPayload = {
  id: string;
  title: string;
  description?: string | null;
  locationName?: string | null;
  address?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
};

function toUtcTimestamp(value: Date) {
  const yyyy = value.getUTCFullYear();
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const min = String(value.getUTCMinutes()).padStart(2, "0");
  const sec = String(value.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${sec}Z`;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsLocation(payload: CalendarEventPayload) {
  return [payload.locationName, payload.address].filter(Boolean).join(" - ");
}

function toIcsDescription(payload: CalendarEventPayload) {
  return payload.description?.trim() || "Evenement Cercle Familial";
}

function toGoogleDates(payload: CalendarEventPayload) {
  const start = toUtcTimestamp(payload.startsAt);
  const fallbackEnd = new Date(payload.startsAt.getTime() + 60 * 60 * 1000);
  const end = toUtcTimestamp(payload.endsAt ?? fallbackEnd);
  return `${start}/${end}`;
}

export function buildGoogleCalendarUrl(payload: CalendarEventPayload) {
  const location = toIcsLocation(payload);
  const description = toIcsDescription(payload);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: payload.title,
    details: description,
    location,
    dates: toGoogleDates(payload),
    ctz: timeZone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsFilename(payload: CalendarEventPayload) {
  const safeTitle = payload.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${safeTitle || "evenement"}-${payload.id}.ics`;
}

export function buildIcsContent(payload: CalendarEventPayload) {
  const dtStamp = toUtcTimestamp(new Date());
  const dtStart = toUtcTimestamp(payload.startsAt);
  const fallbackEnd = new Date(payload.startsAt.getTime() + 60 * 60 * 1000);
  const dtEnd = toUtcTimestamp(payload.endsAt ?? fallbackEnd);

  const location = escapeIcsText(toIcsLocation(payload));
  const description = escapeIcsText(toIcsDescription(payload));
  const summary = escapeIcsText(payload.title);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cercle Familial//Calendrier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${payload.id}@cercle-familial`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

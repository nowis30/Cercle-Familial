const DEFAULT_EVENT_TIME_ZONE = "America/Toronto";

export const EVENT_TIME_ZONE = process.env.EVENT_TIME_ZONE || process.env.NEXT_PUBLIC_EVENT_TIME_ZONE || DEFAULT_EVENT_TIME_ZONE;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function safeFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  }
}

const PARTS_FORMATTER = safeFormatter("en-CA", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const DATE_FORMATTER = safeFormatter("fr-CA", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMATTER = safeFormatter("fr-CA", {
  timeZone: EVENT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getZonedParts(value: Date): ZonedParts {
  const map = new Map<string, string>();
  for (const part of PARTS_FORMATTER.formatToParts(value)) {
    if (part.type !== "literal") {
      map.set(part.type, part.value);
    }
  }

  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    hour: Number(map.get("hour")),
    minute: Number(map.get("minute")),
    second: Number(map.get("second")),
  };
}

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  return { year, month, day, hour, minute };
}

function toDateTimeLocalString(parts: { year: number; month: number; day: number; hour: number; minute: number }) {
  const yyyy = String(parts.year).padStart(4, "0");
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function parseEventDateTimeLocal(value: string) {
  const parsed = parseDateTimeLocal(value);
  if (!parsed) {
    throw new Error("Format datetime-local invalide");
  }

  // Approximation initiale en UTC puis correction iterative vers le fuseau metier.
  let timestamp = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0, 0);
  const targetEpoch = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0, 0);

  for (let i = 0; i < 4; i++) {
    const zoned = getZonedParts(new Date(timestamp));
    const observedEpoch = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, 0, 0);
    const diff = targetEpoch - observedEpoch;
    if (diff === 0) break;
    timestamp += diff;
  }

  return new Date(timestamp);
}

export function tryParseEventDateTimeLocal(value: string) {
  try {
    return parseEventDateTimeLocal(value);
  } catch {
    return null;
  }
}

export function toEventDateTimeLocalValue(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = getZonedParts(date);
  return toDateTimeLocalString(parts);
}

export function formatEventDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_FORMATTER.format(date);
}

export function formatEventTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return TIME_FORMATTER.format(date);
}

export function formatEventDateTime(value: Date | string) {
  return `${formatEventDate(value)} ${formatEventTime(value)}`;
}

export function toEventDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = getZonedParts(date);
  const yyyy = String(parts.year).padStart(4, "0");
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addOneDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  const yyyy = String(cursor.getUTCFullYear()).padStart(4, "0");
  const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(cursor.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getUtcRangeForEventDay(dateKey: string) {
  const start = parseEventDateTimeLocal(`${dateKey}T00:00`);
  const nextDayKey = addOneDay(dateKey);
  const nextStart = parseEventDateTimeLocal(`${nextDayKey}T00:00`);
  const end = new Date(nextStart.getTime() - 1);
  return { start, end };
}

export function getUtcRangeForEventMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const startKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month - 1, 1));
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonthKey = `${String(nextMonthDate.getUTCFullYear()).padStart(4, "0")}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const start = parseEventDateTimeLocal(`${startKey}T00:00`);
  const nextStart = parseEventDateTimeLocal(`${nextMonthKey}T00:00`);
  const end = new Date(nextStart.getTime() - 1);

  return { start, end };
}

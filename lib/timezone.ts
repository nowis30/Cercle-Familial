const DEFAULT_APP_TIME_ZONE = "America/Toronto";
const SAFE_FALLBACK_TIME_ZONE = "UTC";

const appTimeZoneFromEnv = process.env.APP_TIME_ZONE || process.env.EVENT_TIME_ZONE || process.env.NEXT_PUBLIC_EVENT_TIME_ZONE;

const FALLBACK_TIME_ZONE_OPTIONS = [
  "America/Toronto",
  "America/Vancouver",
  "America/Halifax",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Regina",
  "America/St_Johns",
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Casablanca",
  "Africa/Algiers",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

export function isValidIanaTimeZone(value?: string | null): value is string {
  if (!value) return false;

  try {
    new Intl.DateTimeFormat("fr-CA", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getAppDefaultTimeZone() {
  if (isValidIanaTimeZone(appTimeZoneFromEnv)) {
    return appTimeZoneFromEnv;
  }

  if (isValidIanaTimeZone(DEFAULT_APP_TIME_ZONE)) {
    return DEFAULT_APP_TIME_ZONE;
  }

  return SAFE_FALLBACK_TIME_ZONE;
}

export function getEffectiveTimeZone(userTimeZone?: string | null) {
  if (isValidIanaTimeZone(userTimeZone)) {
    return userTimeZone;
  }

  const appDefaultTimeZone = getAppDefaultTimeZone();
  if (isValidIanaTimeZone(appDefaultTimeZone)) {
    return appDefaultTimeZone;
  }

  return SAFE_FALLBACK_TIME_ZONE;
}

export function getTimeZoneOptions() {
  const supportedValues =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

  const source = supportedValues.length > 0 ? supportedValues : FALLBACK_TIME_ZONE_OPTIONS;
  const merged = new Set<string>([...source, getAppDefaultTimeZone(), SAFE_FALLBACK_TIME_ZONE]);

  return [...merged].filter((timeZone) => isValidIanaTimeZone(timeZone)).sort((a, b) => a.localeCompare(b));
}

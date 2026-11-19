// Stored times are ISO-8601 UTC strings like "2026-11-17T15:00:00.000Z" (what Date#toISOString makes).
// Shown times are in the viewer's own time zone.

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

export function isUtcIso(value: string): boolean {
  return UTC_ISO.test(value) && !Number.isNaN(Date.parse(value));
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

// "2026-11-19"
export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "3:04 PM"
export function localTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// "Thu 2026-11-19, 3:00 PM"
export function meetupWhen(iso: string): string {
  return `${new Date(iso).toLocaleDateString("en-US", { weekday: "short" })} ${localDate(iso)}, ${localTime(iso)}`;
}

// Today shows just the time; older days show the date too.
export function messageWhen(iso: string, now = new Date().toISOString()): string {
  return localDate(iso) === localDate(now) ? localTime(iso) : `${localDate(iso)} ${localTime(iso)}`;
}

// <input type="datetime-local"> speaks local time with no zone ("2026-11-19T15:00").
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${localDate(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

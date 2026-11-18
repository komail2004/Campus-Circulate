// Stored times are ISO-8601 UTC strings like "2026-11-17T15:00:00.000Z" (what Date#toISOString makes).

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isUtcIso(value: string): boolean {
  return UTC_ISO.test(value) && !Number.isNaN(Date.parse(value));
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

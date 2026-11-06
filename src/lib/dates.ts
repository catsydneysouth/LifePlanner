export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week containing iso */
export function startOfWeek(iso: string): string {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = fromISO(fromIso).getTime();
  const b = fromISO(toIso).getTime();
  return Math.round((b - a) / 86400000);
}

export function fmtDay(iso: string): { dow: string; num: string; month: string } {
  const d = fromISO(iso);
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    num: String(d.getDate()),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
  };
}

export function fmtShort(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtWeekRange(startIso: string): string {
  const end = addDays(startIso, 6);
  const a = fromISO(startIso);
  const b = fromISO(end);
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const right = b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${left} – ${right}`;
}

/** Friendly label + urgency for an expiry date. */
export type ExpiryLevel = 'none' | 'expired' | 'today' | 'soon' | 'ok';
export function expiryInfo(expiry: string, now: string): { level: ExpiryLevel; label: string; days: number } {
  if (!expiry) return { level: 'none', label: 'No date', days: Infinity };
  const days = daysBetween(now, expiry);
  if (days < 0) return { level: 'expired', label: days === -1 ? 'Expired yesterday' : `Expired ${-days} days ago`, days };
  if (days === 0) return { level: 'today', label: 'Today', days };
  if (days === 1) return { level: 'soon', label: 'Tomorrow', days };
  if (days <= 3) return { level: 'soon', label: `${days} days`, days };
  if (days <= 14) return { level: 'ok', label: `${days} days`, days };
  return { level: 'ok', label: fmtShort(expiry), days };
}

export function startOfMonth(iso: string): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function fmtMonth(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function fmtLong(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Friendly label + urgency for a to-do's due date. */
export type DueLevel = 'none' | 'overdue' | 'today' | 'soon' | 'later';
export function dueInfo(due: string, now: string): { level: DueLevel; label: string } {
  if (!due) return { level: 'none', label: 'No date' };
  const days = daysBetween(now, due);
  if (days < 0) return { level: 'overdue', label: days === -1 ? 'Yesterday' : `${-days} days late` };
  if (days === 0) return { level: 'today', label: 'Today' };
  if (days === 1) return { level: 'soon', label: 'Tomorrow' };
  if (days <= 6) return { level: 'soon', label: fromISO(due).toLocaleDateString('en-GB', { weekday: 'long' }) };
  return { level: 'later', label: fmtShort(due) };
}

/** "09:30" -> "9:30am" style, kept simple and UK friendly (24-hour). */
export function fmtTimeRange(start: string, end: string, allDay: boolean): string {
  if (allDay || !start) return 'All day';
  return end ? `${start}–${end}` : start;
}

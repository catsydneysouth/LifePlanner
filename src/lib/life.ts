import type { Chore, Habit, Project, Trip } from '../types';
import { addDays, daysBetween, fromISO, toISO } from './dates';

/** Monday = 0 ... Sunday = 6 */
export function dayIndex(iso: string): number {
  return (fromISO(iso).getDay() + 6) % 7;
}

/** How many scheduled days in a row you've ticked, counting back from today. Today doesn't break the run if it's not ticked yet. */
export function habitStreak(h: Habit, now: string): number {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = addDays(now, -i);
    if (!h.days.includes(dayIndex(day))) continue;
    if (h.log.includes(day)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export function choreDue(c: Chore, now: string): string {
  return c.last ? addDays(c.last, c.everyDays) : now;
}

export type ChoreLevel = 'overdue' | 'today' | 'week' | 'later';
export function choreStatus(c: Chore, now: string): { level: ChoreLevel; label: string; days: number } {
  const days = daysBetween(now, choreDue(c, now));
  if (days < 0) return { level: 'overdue', label: days === -1 ? 'Yesterday' : `${-days} days late`, days };
  if (days === 0) return { level: 'today', label: 'Due Today', days };
  if (days === 1) return { level: 'week', label: 'Tomorrow', days };
  if (days <= 7) return { level: 'week', label: `In ${days} days`, days };
  return { level: 'later', label: `In ${days} days`, days };
}

export function everyLabel(n: number): string {
  if (n === 1) return 'Every day';
  if (n === 7) return 'Every week';
  if (n === 14) return 'Every 2 weeks';
  if (n === 30) return 'Every month';
  if (n === 365) return 'Every year';
  return `Every ${n} days`;
}

export function projectProgress(p: Project): { pct: number; label: string } {
  if (p.target && p.target > 0) {
    const pct = Math.min(100, Math.round((p.current / p.target) * 100));
    return { pct, label: `${p.current} of ${p.target}${p.unit ? ' ' + p.unit : ''}` };
  }
  if (p.steps.length > 0) {
    const done = p.steps.filter((s) => s.done).length;
    return { pct: Math.round((done / p.steps.length) * 100), label: `${done} of ${p.steps.length} steps` };
  }
  return { pct: p.status === 'done' ? 100 : 0, label: 'No steps yet' };
}

export function tripCountdown(t: Trip, now: string): string {
  if (!t.start) return '';
  const toStart = daysBetween(now, t.start);
  if (toStart > 1) return `In ${toStart} days`;
  if (toStart === 1) return 'Tomorrow';
  if (toStart === 0) return 'Starts today';
  if (t.end && daysBetween(now, t.end) >= 0) return 'Happening now';
  return 'Done';
}

export const gbp = (n: number): string => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Next date a bill falls due (day of month, clipped to short months). */
export function nextBillDate(day: number, now: string): string {
  const d = fromISO(now);
  const mk = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    return toISO(new Date(y, m, Math.min(day, last)));
  };
  const thisMonth = mk(d.getFullYear(), d.getMonth());
  return thisMonth >= now ? thisMonth : mk(d.getFullYear(), d.getMonth() + 1);
}

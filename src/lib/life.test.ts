import { describe, expect, it } from 'vitest';
import { choreStatus, habitStreak, nextBillDate, projectProgress } from './life';
import type { Chore, Habit, Project } from '../types';

// Fri 6 Nov 2026
const NOW = '2026-11-06';

describe('habit streaks', () => {
  const daily: Habit = { id: 'h', name: 'Walk', days: [0, 1, 2, 3, 4, 5, 6], log: ['2026-11-05', '2026-11-04', '2026-11-03'] };
  it('counts back from yesterday when today is not ticked yet', () => {
    expect(habitStreak(daily, NOW)).toBe(3);
  });
  it('counts today as well when ticked', () => {
    expect(habitStreak({ ...daily, log: [...daily.log, NOW] }, NOW)).toBe(4);
  });
  it('breaks on a missed scheduled day', () => {
    expect(habitStreak({ ...daily, log: ['2026-11-05', '2026-11-03'] }, NOW)).toBe(1);
  });
  it('skips days that are not scheduled (Mon/Wed/Fri habit)', () => {
    const mwf: Habit = { id: 'h', name: 'Gym', days: [0, 2, 4], log: ['2026-11-04', '2026-11-02', '2026-10-30'] };
    expect(habitStreak(mwf, NOW)).toBe(3);
  });
});

describe('chores', () => {
  const c = (last: string, everyDays: number): Chore => ({ id: 'c', title: 'x', area: '', everyDays, last });
  it('a chore never done is due now', () => expect(choreStatus(c('', 7), NOW).level).toBe('today'));
  it('is overdue once its interval has passed', () => {
    expect(choreStatus(c('2026-10-25', 7), NOW)).toMatchObject({ level: 'overdue', label: '5 days late' });
  });
  it('is due in the future otherwise', () => expect(choreStatus(c('2026-11-05', 30), NOW).level).toBe('later'));
});

describe('projects and bills', () => {
  const p = (over: Partial<Project>): Project => ({ id: 'p', kind: 'project', title: 't', area: '', status: 'active', due: '', notes: '', steps: [], target: null, current: 0, unit: '', ...over });
  it('progress from steps', () => {
    expect(projectProgress(p({ steps: [{ id: '1', text: 'a', done: true }, { id: '2', text: 'b', done: false }] }))).toEqual({ pct: 50, label: '1 of 2 steps' });
  });
  it('progress from a number target, capped at 100', () => {
    expect(projectProgress(p({ kind: 'goal', target: 500, current: 600, unit: 'km' })).pct).toBe(100);
  });
  it('next bill date rolls to next month once passed and clips short months', () => {
    expect(nextBillDate(10, NOW)).toBe('2026-11-10');
    expect(nextBillDate(5, NOW)).toBe('2026-12-05');
    expect(nextBillDate(31, '2026-02-10')).toBe('2026-02-28');
  });
});

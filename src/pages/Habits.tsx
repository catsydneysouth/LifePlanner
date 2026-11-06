import { useState } from 'react';
import type { Habit, Workout } from '../types';
import { useStore } from '../store';
import { EmptyState, Icon, Modal } from '../components/ui';
import { addDays, fmtShort, fromISO, startOfWeek, today } from '../lib/dates';
import { dayIndex, habitStreak } from '../lib/life';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WORKOUT_TYPES = ['Run', 'Strength', 'Walk', 'Cycle', 'Swim', 'Yoga', 'Other'];

function HabitModal({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(habit?.name ?? '');
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const save = () => {
    if (!name.trim() || days.length === 0) return;
    actions.save('habits', { id: habit?.id, name: name.trim(), days, log: habit?.log ?? [] });
    onClose();
  };
  return (
    <Modal title={habit ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>Habit</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
        <div className="field"><span>Which Days</span>
          <div className="pills">{DAY_NAMES.map((n, i) => <button key={n} type="button" className={'pill' + (days.includes(i) ? ' on' : '')} onClick={() => toggle(i)}>{n}</button>)}</div>
        </div>
      </div>
      <div className="modal-foot">
        {habit && <button className="btn btn-danger spread" onClick={() => { if (window.confirm(`Delete “${habit.name}” and its history?`)) { actions.remove('habits', habit.id); onClose(); } }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!name.trim() || days.length === 0}>Save</button>
      </div>
    </Modal>
  );
}

function WorkoutModal({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const { actions } = useStore();
  const [date, setDate] = useState(workout?.date ?? today());
  const [type, setType] = useState(workout?.type ?? 'Run');
  const [minutes, setMinutes] = useState(workout?.minutes?.toString() ?? '');
  const [km, setKm] = useState(workout?.km?.toString() ?? '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const save = () => {
    actions.save('workouts', { id: workout?.id, date, type, minutes: num(minutes), km: num(km), notes: notes.trim() });
    onClose();
  };
  return (
    <Modal title={workout ? 'Edit Workout' : 'Log A Workout'} onClose={onClose}>
      <div className="stack">
        <div className="grid-2">
          <label className="field"><span>Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field"><span>Type</span><select className="select" value={type} onChange={(e) => setType(e.target.value)}>{WORKOUT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Minutes</span><input className="input" type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
          <label className="field"><span>Distance (km)</span><input className="input" type="number" min="0" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} /></label>
        </div>
        <label className="field"><span>Notes</span><textarea className="textarea" style={{ minHeight: 70 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {workout && <button className="btn btn-danger spread" onClick={() => { actions.remove('workouts', workout.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

/** Tick-boxes for the last 7 days of one habit; used on this page and on Today. */
export function HabitTicks({ habit, days }: { habit: Habit; days: string[] }) {
  const { actions } = useStore();
  const toggle = (d: string) => {
    const log = habit.log.includes(d) ? habit.log.filter((x) => x !== d) : [...habit.log, d];
    actions.save('habits', { ...habit, log });
  };
  return (
    <>
      {days.map((d) => {
        const scheduled = habit.days.includes(dayIndex(d));
        const on = habit.log.includes(d);
        return (
          <td key={d} className="hb-cell">
            {scheduled ? (
              <button className={'tick' + (on ? ' on' : '')} onClick={() => toggle(d)} aria-label={`${habit.name} on ${fmtShort(d)}`}>{on && <Icon name="check" size={14} />}</button>
            ) : <span className="hb-off">–</span>}
          </td>
        );
      })}
    </>
  );
}

export function HabitsPage() {
  const { state } = useStore();
  const now = today();
  const [editHabit, setEditHabit] = useState<Habit | 'new' | null>(null);
  const [editWorkout, setEditWorkout] = useState<Workout | 'new' | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));
  const monday = startOfWeek(now);
  const thisWeek = state.workouts.filter((w) => w.date >= monday && w.date <= addDays(monday, 6));
  const sum = (f: (w: Workout) => number | null) => thisWeek.reduce((n, w) => n + (f(w) ?? 0), 0);
  const recent = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  return (
    <>
      <div className="page-head">
        <div><h1>Habits & Fitness</h1><div className="sub">Tick off your habits and log your training.</div></div>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><div><h2>Habits</h2><div className="panel-sub">The last 7 days</div></div><button className="btn btn-primary btn-sm" onClick={() => setEditHabit('new')}><Icon name="plus" size={14} /> New Habit</button></div>
          {state.habits.length === 0 ? (
            <div className="card"><EmptyState title="No Habits Yet">Add something you want to do regularly, like a daily walk.</EmptyState></div>
          ) : (
            <div className="card hb-wrap">
              <table className="hb-table">
                <thead><tr><th></th>{days.map((d) => <th key={d} className={d === now ? 'is-today' : ''}>{DAY_NAMES[dayIndex(d)]}<small>{fromISO(d).getDate()}</small></th>)}<th>Streak</th></tr></thead>
                <tbody>
                  {state.habits.map((h) => (
                    <tr key={h.id}>
                      <td className="hb-name"><button className="link-plain" onClick={() => setEditHabit(h)}>{h.name}</button></td>
                      <HabitTicks habit={h} days={days} />
                      <td className="hb-streak">{habitStreak(h, now)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Workouts</h2><div className="panel-sub">This week</div></div><button className="btn btn-primary btn-sm" onClick={() => setEditWorkout('new')}><Icon name="plus" size={14} /> Log Workout</button></div>
          <div className="stat-row">
            <div className="stat"><b>{thisWeek.length}</b><span>Sessions</span></div>
            <div className="stat"><b>{sum((w) => w.minutes)}</b><span>Minutes</span></div>
            <div className="stat"><b>{Math.round(sum((w) => w.km) * 10) / 10}</b><span>Km</span></div>
          </div>
          {recent.length === 0 ? (
            <div className="card"><EmptyState title="No Workouts Logged">Log a run or a gym session to start building a picture of your week.</EmptyState></div>
          ) : (
            <div className="card list">
              {recent.map((w) => (
                <div key={w.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div>
                    <div className="item-name">{w.type}{w.km ? ` · ${w.km} km` : ''}{w.minutes ? ` · ${w.minutes} min` : ''}</div>
                    <div className="item-meta"><span>{fromISO(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>{w.notes && <span>{w.notes}</span>}</div>
                  </div>
                  <button className="icon-btn" aria-label={`Edit ${w.type} on ${w.date}`} onClick={() => setEditWorkout(w)}><Icon name="edit" size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editHabit && <HabitModal habit={editHabit === 'new' ? null : editHabit} onClose={() => setEditHabit(null)} />}
      {editWorkout && <WorkoutModal workout={editWorkout === 'new' ? null : editWorkout} onClose={() => setEditWorkout(null)} />}
    </>
  );
}

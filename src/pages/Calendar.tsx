import { useState } from 'react';
import type { CalEvent } from '../types';
import { useStore } from '../store';
import { Icon, Modal } from '../components/ui';
import { addDays, addMonths, fmtLong, fmtMonth, fmtTimeRange, fromISO, startOfMonth, startOfWeek, today, toISO } from '../lib/dates';
import { TaskModal, TaskRow } from './Todos';
import type { Task } from '../types';
import { SLOTS } from '../types';

export function EventModal({ event, defaultDate, onClose }: { event: CalEvent | null; defaultDate: string; onClose: () => void }) {
  const { actions } = useStore();
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [allDay, setAllDay] = useState(event ? event.allDay : false);
  const [start, setStart] = useState(event?.start ?? '09:00');
  const [end, setEnd] = useState(event?.end ?? '10:00');
  const [notes, setNotes] = useState(event?.notes ?? '');

  const save = () => {
    if (!title.trim() || !date) return;
    actions.saveEvent({ id: event?.id, title: title.trim(), date, allDay, start: allDay ? '' : start, end: allDay ? '' : end, notes: notes.trim() });
    onClose();
  };

  return (
    <Modal title={event ? 'Edit Event' : 'New Event'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>What’s Happening</span><input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
        <label className="field"><span>Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All Day</label>
        {!allDay && (
          <div className="grid-2">
            <label className="field"><span>Starts</span><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="field"><span>Ends</span><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
        )}
        <label className="field"><span>Notes</span><textarea className="textarea" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {event && <button className="btn btn-danger spread" onClick={() => { actions.deleteEvent(event.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!title.trim() || !date}>Save</button>
      </div>
    </Modal>
  );
}

export function sortEvents(list: CalEvent[]): CalEvent[] {
  return [...list].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export function EventRow({ event, onEdit }: { event: CalEvent; onEdit: (e: CalEvent) => void }) {
  return (
    <button className="event-row" onClick={() => onEdit(event)}>
      <span className="event-time">{fmtTimeRange(event.start, event.end, event.allDay)}</span>
      <span className="event-title">{event.title}</span>
    </button>
  );
}

export function CalendarPage() {
  const { state } = useStore();
  const now = today();
  const [month, setMonth] = useState(startOfMonth(now));
  const [selected, setSelected] = useState(now);
  const [editEvent, setEditEvent] = useState<CalEvent | 'new' | null>(null);
  const [editTask, setEditTask] = useState<Task | 'new' | null>(null);

  // 6 weeks of days starting on the Monday on or before the 1st
  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const rows = fromISO(addDays(gridStart, 35)).getMonth() === fromISO(month).getMonth() ? 6 : 5;
  const shownDays = days.slice(0, rows * 7);

  const eventsOn = (iso: string) => sortEvents(state.events.filter((e) => e.date === iso));
  const tasksOn = (iso: string) => state.tasks.filter((t) => t.due === iso && !t.done);
  const mealsOn = (iso: string) => SLOTS.flatMap((slot) => (state.plan[iso]?.[slot] ?? []).map((m) => ({ slot, m })));

  const selEvents = eventsOn(selected);
  const selTasks = state.tasks.filter((t) => t.due === selected);
  const selMeals = mealsOn(selected);
  const recipeName = (id: string) => state.recipes.find((r) => r.id === id)?.name ?? 'Deleted recipe';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <div className="sub">Your events, with to-dos and meals alongside.</div>
        </div>
        <div className="row">
          <div className="week-nav">
            <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><Icon name="chevL" /></button>
            <div className="range">{fmtMonth(month)}</div>
            <button className="icon-btn" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><Icon name="chevR" /></button>
          </div>
          <button className="btn btn-sm" onClick={() => { setMonth(startOfMonth(now)); setSelected(now); }}>Today</button>
          <button className="btn btn-primary" onClick={() => setEditEvent('new')}><Icon name="plus" size={16} /> New Event</button>
        </div>
      </div>

      <div className="cal-layout">
        <div className="card cal">
          <div className="cal-head">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="cal-grid" style={{ gridTemplateRows: `repeat(${rows}, minmax(92px, 1fr))` }}>
            {shownDays.map((iso) => {
              const evs = eventsOn(iso);
              const tks = tasksOn(iso);
              const inMonth = iso.slice(0, 7) === month.slice(0, 7);
              return (
                <button key={iso} className={'cal-day' + (inMonth ? '' : ' faded') + (iso === now ? ' is-today' : '') + (iso === selected ? ' selected' : '')} onClick={() => setSelected(iso)} aria-label={fmtLong(iso)}>
                  <span className="cal-num">{fromISO(iso).getDate()}</span>
                  {evs.slice(0, 3).map((e) => <span key={e.id} className="cal-chip">{e.start && <b>{e.start}</b>} {e.title}</span>)}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3} more</span>}
                  {tks.length > 0 && <span className="cal-todo">{tks.length} to-do{tks.length > 1 ? 's' : ''}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="panel cal-side">
          <div className="panel-head">
            <div>
              <h2>{fmtLong(selected)}</h2>
              <div className="panel-sub">{selected === now ? 'Today' : toISO(fromISO(selected)) < now ? 'In the past' : ''}</div>
            </div>
          </div>
          <div className="side-section">
            <div className="side-title"><span>Events</span><button className="btn btn-sm" onClick={() => setEditEvent('new')}><Icon name="plus" size={14} /> Add</button></div>
            {selEvents.length === 0 ? <div className="muted-note">Nothing in the diary.</div> : selEvents.map((e) => <EventRow key={e.id} event={e} onEdit={setEditEvent} />)}
          </div>
          <div className="side-section">
            <div className="side-title"><span>To-Dos Due</span><button className="btn btn-sm" onClick={() => setEditTask('new')}><Icon name="plus" size={14} /> Add</button></div>
            {selTasks.length === 0 ? <div className="muted-note">Nothing due.</div> : <div className="card list">{selTasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEditTask} />)}</div>}
          </div>
          <div className="side-section">
            <div className="side-title"><span>Meals</span><a className="muted-link" href="#/plan">Meal Plan</a></div>
            {selMeals.length === 0 ? <div className="muted-note">No meals planned.</div> : selMeals.map(({ slot, m }) => (
              <div key={m.id} className="event-row static"><span className="event-time">{slot[0].toUpperCase() + slot.slice(1)}</span><span className="event-title">{m.kind === 'text' ? m.text : recipeName(m.recipeId)}</span></div>
            ))}
          </div>
        </aside>
      </div>

      {editEvent && <EventModal event={editEvent === 'new' ? null : editEvent} defaultDate={selected} onClose={() => setEditEvent(null)} />}
      {editTask && <TaskModal task={editTask === 'new' ? null : editTask} defaultDue={selected} onClose={() => setEditTask(null)} />}
    </>
  );
}

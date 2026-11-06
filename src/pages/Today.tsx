import { useState } from 'react';
import type { CalEvent, Task } from '../types';
import { SLOTS } from '../types';
import { useStore } from '../store';
import { Icon } from '../components/ui';
import { addDays, daysBetween, fmtLong, fmtShort, today } from '../lib/dates';
import { TaskModal, TaskRow } from './Todos';
import { EventModal, EventRow, sortEvents } from './Calendar';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
}

/** Today: everything about your day on one page. */
export function TodayPage() {
  const { state } = useStore();
  const now = today();
  const [editTask, setEditTask] = useState<Task | 'new' | null>(null);
  const [editEvent, setEditEvent] = useState<CalEvent | 'new' | null>(null);

  const todayEvents = sortEvents(state.events.filter((e) => e.date === now));
  const upcoming = sortEvents(state.events.filter((e) => e.date > now && e.date <= addDays(now, 7))).sort((a, b) => a.date.localeCompare(b.date));
  const dueTasks = state.tasks.filter((t) => !t.done && t.due && t.due <= now).sort((a, b) => a.due.localeCompare(b.due) || Number(b.priority) - Number(a.priority));
  const doneToday = state.tasks.filter((t) => t.done && t.due && t.due <= now).length;
  const meals = SLOTS.map((slot) => ({ slot, entries: state.plan[now]?.[slot] ?? [] }));
  const mealCount = meals.reduce((n, m) => n + m.entries.length, 0);
  const goingOff = state.pantry.filter((p) => p.expiry && daysBetween(now, p.expiry) <= 2).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const recipeName = (id: string) => state.recipes.find((r) => r.id === id)?.name ?? 'Deleted recipe';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting()}, Laura</h1>
          <div className="sub">{fmtLong(now)}</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setEditEvent('new')}><Icon name="plus" size={16} /> New Event</button>
          <button className="btn btn-primary" onClick={() => setEditTask('new')}><Icon name="plus" size={16} /> New To-Do</button>
        </div>
      </div>

      <div className="today-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Schedule</h2><div className="panel-sub">{todayEvents.length === 0 ? 'Nothing in the diary today' : `${todayEvents.length} ${todayEvents.length === 1 ? 'event' : 'events'}`}</div></div><a className="muted-link" href="#/calendar">Calendar</a></div>
          {todayEvents.map((e) => <EventRow key={e.id} event={e} onEdit={setEditEvent} />)}
          {upcoming.length > 0 && (
            <>
              <div className="side-title" style={{ marginTop: 16 }}><span>Coming Up This Week</span></div>
              {upcoming.slice(0, 5).map((e) => (
                <button key={e.id} className="event-row" onClick={() => setEditEvent(e)}><span className="event-time">{fmtShort(e.date)}</span><span className="event-title">{e.title}</span></button>
              ))}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>To-Dos</h2><div className="panel-sub">{dueTasks.length === 0 ? (doneToday > 0 ? 'All done for today' : 'Nothing due today') : `${dueTasks.length} due today or late`}</div></div><a className="muted-link" href="#/todos">All To-Dos</a></div>
          {dueTasks.length > 0 && <div className="card list">{dueTasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEditTask} />)}</div>}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Meals</h2><div className="panel-sub">{mealCount === 0 ? 'Nothing planned today' : 'Planned for today'}</div></div><a className="muted-link" href="#/plan">Meal Plan</a></div>
          {meals.filter((m) => m.entries.length > 0).map(({ slot, entries }) => (
            <div key={slot} className="event-row static">
              <span className="event-time">{slot[0].toUpperCase() + slot.slice(1)}</span>
              <span className="event-title">{entries.map((e) => (e.kind === 'text' ? e.text : recipeName(e.recipeId))).join(' + ')}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Use It Up</h2><div className="panel-sub">{goingOff.length === 0 ? 'Nothing going off soon' : 'Going off in the next 2 days'}</div></div><a className="muted-link" href="#/kitchen">Kitchen</a></div>
          {goingOff.length > 0 && <div className="chips">{goingOff.map((p) => <span key={p.id} className="chip">{p.name}</span>)}</div>}
        </section>
      </div>

      {editTask && <TaskModal task={editTask === 'new' ? null : editTask} defaultDue={now} onClose={() => setEditTask(null)} />}
      {editEvent && <EventModal event={editEvent === 'new' ? null : editEvent} defaultDate={now} onClose={() => setEditEvent(null)} />}
    </>
  );
}

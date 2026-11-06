import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { useStore } from '../store';
import { EmptyState, Icon, Modal } from '../components/ui';
import { addDays, dueInfo, today } from '../lib/dates';

/** One to-do row: tick box, title, project, due date, edit. Used here and on the Today page. */
export function TaskRow({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { actions } = useStore();
  const now = today();
  const due = dueInfo(task.due, now);
  return (
    <div className={'item task' + (task.done ? ' is-done' : '')}>
      <button className={'tick' + (task.done ? ' on' : '')} onClick={() => actions.toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}>
        {task.done && <Icon name="check" size={14} />}
      </button>
      <div className="grow">
        <div className="task-title">{task.priority && <span className="flag" title="Important">!</span>}{task.title}</div>
        {(task.project || task.due) && (
          <div className="task-meta">
            {task.due && <span className={`badge badge-due-${due.level}`}>{due.label}</span>}
            {task.project && <span className="tag">{task.project}</span>}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Icon name="edit" size={16} /></button>
    </div>
  );
}

export function TaskModal({ task, onClose, defaultDue = '' }: { task: Task | null; onClose: () => void; defaultDue?: string }) {
  const { state, actions } = useStore();
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.due ?? defaultDue);
  const [project, setProject] = useState(task?.project ?? '');
  const [priority, setPriority] = useState(task?.priority ?? false);
  const [notes, setNotes] = useState(task?.notes ?? '');
  const projects = useMemo(() => [...new Set(state.tasks.map((t) => t.project).filter(Boolean))].sort(), [state.tasks]);

  const save = () => {
    if (!title.trim()) return;
    actions.saveTask({ id: task?.id, title: title.trim(), due, project: project.trim(), priority, notes: notes.trim() });
    onClose();
  };

  return (
    <Modal title={task ? 'Edit To-Do' : 'New To-Do'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>What Needs Doing</span>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </label>
        <div className="grid-2">
          <label className="field"><span>Due</span><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="field"><span>List</span>
            <input className="input" list="task-projects" placeholder="e.g. Work, Home" value={project} onChange={(e) => setProject(e.target.value)} />
            <datalist id="task-projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
        </div>
        <label className="check-label"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} /> Mark As Important</label>
        <label className="field"><span>Notes</span><textarea className="textarea" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {task && <button className="btn btn-danger spread" onClick={() => { actions.deleteTask(task.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!title.trim()}>Save</button>
      </div>
    </Modal>
  );
}

type View = 'open' | 'today' | 'week' | 'done';

export function TodosPage() {
  const { state, actions } = useStore();
  const now = today();
  const [view, setView] = useState<View>('open');
  const [list, setList] = useState<string>('all');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState('');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);

  const lists = useMemo(() => [...new Set(state.tasks.map((t) => t.project).filter(Boolean))].sort(), [state.tasks]);
  const weekEnd = addDays(now, 6);

  const matches = (t: Task) => (list === 'all' || t.project === list) && t.title.toLowerCase().includes(q.toLowerCase());
  const open = state.tasks.filter((t) => !t.done && matches(t));
  const done = state.tasks.filter((t) => t.done && matches(t));

  const counts = {
    open: state.tasks.filter((t) => !t.done).length,
    today: state.tasks.filter((t) => !t.done && t.due && t.due <= now).length,
    week: state.tasks.filter((t) => !t.done && t.due && t.due <= weekEnd).length,
    done: state.tasks.filter((t) => t.done).length,
  };

  const byDue = (a: Task, b: Task) => (a.due || '9999').localeCompare(b.due || '9999') || Number(b.priority) - Number(a.priority) || a.title.localeCompare(b.title);

  const groups: { title: string; tasks: Task[] }[] = [];
  if (view === 'done') {
    groups.push({ title: 'Done', tasks: done });
  } else {
    const pool = open.filter((t) => (view === 'today' ? t.due && t.due <= now : view === 'week' ? t.due && t.due <= weekEnd : true)).sort(byDue);
    groups.push(
      { title: 'Overdue', tasks: pool.filter((t) => t.due && t.due < now) },
      { title: 'Today', tasks: pool.filter((t) => t.due === now) },
      { title: 'Coming Up', tasks: pool.filter((t) => t.due && t.due > now) },
      { title: 'No Date', tasks: pool.filter((t) => !t.due) },
    );
  }
  const visible = groups.filter((g) => g.tasks.length > 0);

  const addQuick = () => {
    if (!quick.trim()) return;
    actions.saveTask({ title: quick.trim(), due: view === 'today' ? now : '', project: list === 'all' ? '' : list, priority: false, notes: '' });
    setQuick('');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>To-Dos</h1>
          <div className="sub">{counts.open} open · {counts.today} due today or late</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> New To-Do</button>
      </div>

      <div className="addbar" style={{ maxWidth: 720 }}>
        <input className="input" placeholder="Add a to-do and press Enter" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuick()} />
        <button className="btn" onClick={addQuick}><Icon name="plus" size={16} /> Add</button>
      </div>

      <div className="controls-row">
        <div className="pills">
          {([['open', 'All Open'], ['today', 'Today'], ['week', 'Next 7 Days'], ['done', 'Done']] as [View, string][]).map(([v, label]) => (
            <button key={v} className={'pill' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{label}<span className="pill-n">{counts[v]}</span></button>
          ))}
        </div>
        <div className="searchbox"><Icon name="search" size={16} /><input className="input" placeholder="Search to-dos" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {lists.length > 0 && (
        <div className="pills" style={{ marginBottom: 18 }}>
          <button className={'pill' + (list === 'all' ? ' on' : '')} onClick={() => setList('all')}>All Lists</button>
          {lists.map((l) => <button key={l} className={'pill' + (list === l ? ' on' : '')} onClick={() => setList(l)}>{l}</button>)}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState title={view === 'done' ? 'Nothing Ticked Off Yet' : 'All Clear'}>
            {view === 'done' ? 'Things you tick off will collect here.' : 'Nothing to do here. Add something above when it comes to mind.'}
          </EmptyState>
        </div>
      ) : (
        <div className="task-groups">
          {visible.map((g) => (
            <section key={g.title}>
              <div className="group-head">
                <h3 className={g.title === 'Overdue' ? 'late' : ''}>{g.title}</h3><span className="pill-n">{g.tasks.length}</span>
                {g.title === 'Done' && <button className="btn btn-sm btn-ghost" onClick={() => { if (window.confirm('Remove all the ticked-off to-dos?')) actions.clearDoneTasks(); }}>Clear All Done</button>}
              </div>
              <div className="card list">{g.tasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEditing} />)}</div>
            </section>
          ))}
        </div>
      )}

      {editing && <TaskModal task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

import { useState } from 'react';
import type { Chore } from '../types';
import { useStore } from '../store';
import { EmptyState, Icon, Modal } from '../components/ui';
import { today } from '../lib/dates';
import { choreStatus, everyLabel, type ChoreLevel } from '../lib/life';

const AREAS = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Garden', 'General'];
const EVERY = [1, 3, 7, 14, 30, 90, 180, 365];

export function ChoreRow({ chore, onEdit }: { chore: Chore; onEdit: (c: Chore) => void }) {
  const { actions } = useStore();
  const now = today();
  const st = choreStatus(chore, now);
  return (
    <div className="item" style={{ gridTemplateColumns: '1fr auto' }}>
      <div>
        <div className="item-name">{chore.title}</div>
        <div className="item-meta">
          <span className={`badge badge-due-${st.level === 'overdue' ? 'overdue' : st.level === 'today' ? 'today' : st.level === 'week' ? 'soon' : 'later'}`}>{st.label}</span>
          {chore.area && <span className="tag">{chore.area}</span>}
          <span>{everyLabel(chore.everyDays)}</span>
        </div>
      </div>
      <div className="item-actions">
        <button className="btn btn-sm" onClick={() => actions.save('chores', { ...chore, last: now })}><Icon name="check" size={14} /> Done</button>
        <button className="icon-btn" aria-label={`Edit ${chore.title}`} onClick={() => onEdit(chore)}><Icon name="edit" size={16} /></button>
      </div>
    </div>
  );
}

function ChoreModal({ chore, onClose }: { chore: Chore | null; onClose: () => void }) {
  const { actions } = useStore();
  const [title, setTitle] = useState(chore?.title ?? '');
  const [area, setArea] = useState(chore?.area ?? '');
  const [every, setEvery] = useState(chore?.everyDays ?? 7);
  const [last, setLast] = useState(chore?.last ?? '');
  const save = () => {
    if (!title.trim()) return;
    actions.save('chores', { id: chore?.id, title: title.trim(), area: area.trim(), everyDays: Math.max(1, every), last });
    onClose();
  };
  return (
    <Modal title={chore ? 'Edit Home Task' : 'New Home Task'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>What Needs Doing</span><input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
        <div className="grid-2">
          <label className="field"><span>Where</span><input className="input" list="chore-areas" value={area} onChange={(e) => setArea(e.target.value)} /><datalist id="chore-areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist></label>
          <label className="field"><span>How Often</span>
            <select className="select" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
              {(EVERY.includes(every) ? EVERY : [...EVERY, every].sort((a, b) => a - b)).map((n) => <option key={n} value={n}>{everyLabel(n)}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span>Last Done (Leave Empty If Never)</span><input className="input" type="date" value={last} onChange={(e) => setLast(e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {chore && <button className="btn btn-danger spread" onClick={() => { actions.remove('chores', chore.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!title.trim()}>Save</button>
      </div>
    </Modal>
  );
}

export function HomePage() {
  const { state } = useStore();
  const now = today();
  const [editing, setEditing] = useState<Chore | 'new' | null>(null);

  const sorted = [...state.chores].sort((a, b) => choreStatus(a, now).days - choreStatus(b, now).days || a.title.localeCompare(b.title));
  const groups: { title: string; level: ChoreLevel[] }[] = [
    { title: 'Overdue', level: ['overdue'] },
    { title: 'Due Today', level: ['today'] },
    { title: 'This Week', level: ['week'] },
    { title: 'Later', level: ['later'] },
  ];
  const due = sorted.filter((c) => choreStatus(c, now).days <= 0).length;

  return (
    <>
      <div className="page-head">
        <div><h1>Home</h1><div className="sub">{due === 0 ? 'Nothing due right now' : `${due} to do now`} · repeating jobs around the house. Press Done and it comes back when it’s next due.</div></div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> New Home Task</button>
      </div>
      {state.chores.length === 0 ? (
        <div className="card"><EmptyState title="No Home Tasks Yet">Add the jobs that come round again and again, like changing the bedding or cleaning the bathroom.</EmptyState></div>
      ) : (
        <div className="task-groups">
          {groups.map((g) => {
            const list = sorted.filter((c) => g.level.includes(choreStatus(c, now).level));
            if (list.length === 0) return null;
            return (
              <section key={g.title}>
                <div className="group-head"><h3 className={g.title === 'Overdue' ? 'late' : ''}>{g.title}</h3><span className="pill-n">{list.length}</span></div>
                <div className="card list">{list.map((c) => <ChoreRow key={c.id} chore={c} onEdit={setEditing} />)}</div>
              </section>
            );
          })}
        </div>
      )}
      {editing && <ChoreModal chore={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

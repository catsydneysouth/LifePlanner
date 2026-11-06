import { useState } from 'react';
import type { Project, ProjectStatus } from '../types';
import { useStore, uid } from '../store';
import { EmptyState, Icon, Modal, ProgressBar } from '../components/ui';
import { fmtShort } from '../lib/dates';
import { projectProgress } from '../lib/life';

const blank = (kind: 'project' | 'goal'): Project => ({ id: '', kind, title: '', area: '', status: 'active', due: '', notes: '', steps: [], target: null, current: 0, unit: '' });

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { state, actions } = useStore();
  const isNew = !project.id;
  const [p, setP] = useState<Project>(project);
  const [newStep, setNewStep] = useState('');
  const areas = [...new Set(state.projects.map((x) => x.area).filter(Boolean))].sort();
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((cur) => ({ ...cur, [k]: v }));

  const addStep = () => {
    if (!newStep.trim()) return;
    set('steps', [...p.steps, { id: uid(), text: newStep.trim(), done: false }]);
    setNewStep('');
  };
  const save = () => {
    if (!p.title.trim()) return;
    const { id, ...rest } = p;
    actions.save('projects', { ...rest, id: id || undefined, title: p.title.trim() });
    onClose();
  };
  const prog = projectProgress(p);

  return (
    <Modal title={isNew ? (p.kind === 'goal' ? 'New Goal' : 'New Project') : 'Edit ' + (p.kind === 'goal' ? 'Goal' : 'Project')} onClose={onClose} wide>
      <div className="stack">
        <label className="field"><span>Name</span><input className="input" autoFocus value={p.title} onChange={(e) => set('title', e.target.value)} /></label>
        <div className="grid-3">
          <label className="field"><span>Area</span>
            <input className="input" list="proj-areas" placeholder="e.g. Work, Home" value={p.area} onChange={(e) => set('area', e.target.value)} />
            <datalist id="proj-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          </label>
          <label className="field"><span>Status</span>
            <select className="select" value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
              <option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option>
            </select>
          </label>
          <label className="field"><span>Target Date</span><input className="input" type="date" value={p.due} onChange={(e) => set('due', e.target.value)} /></label>
        </div>

        {p.kind === 'goal' && (
          <div className="grid-3">
            <label className="field"><span>Aiming For</span><input className="input" type="number" min="0" placeholder="e.g. 500" value={p.target ?? ''} onChange={(e) => set('target', e.target.value === '' ? null : Number(e.target.value))} /></label>
            <label className="field"><span>So Far</span><input className="input" type="number" min="0" value={p.current} onChange={(e) => set('current', Number(e.target.value) || 0)} /></label>
            <label className="field"><span>Unit</span><input className="input" placeholder="e.g. km" value={p.unit} onChange={(e) => set('unit', e.target.value)} /></label>
          </div>
        )}

        <div className="field">
          <span>Steps {p.steps.length > 0 && <em className="muted-inline">· {prog.label}</em>}</span>
          <div className="card list">
            {p.steps.map((s) => (
              <div key={s.id} className={'item task' + (s.done ? ' is-done' : '')}>
                <button className={'tick' + (s.done ? ' on' : '')} aria-label={`Toggle ${s.text}`} onClick={() => set('steps', p.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}>{s.done && <Icon name="check" size={14} />}</button>
                <div className="task-title">{s.text}</div>
                <button className="icon-btn" aria-label={`Remove ${s.text}`} onClick={() => set('steps', p.steps.filter((x) => x.id !== s.id))}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <div className="item" style={{ gridTemplateColumns: '1fr auto' }}>
              <input className="input" placeholder="Add a step and press Enter" value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} />
              <button className="btn btn-sm" onClick={addStep}><Icon name="plus" size={14} /> Add</button>
            </div>
          </div>
        </div>
        <label className="field"><span>Notes</span><textarea className="textarea" style={{ minHeight: 80 }} value={p.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {!isNew && <button className="btn btn-danger spread" onClick={() => { if (window.confirm(`Delete “${p.title}”?`)) { actions.remove('projects', p.id); onClose(); } }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!p.title.trim()}>Save</button>
      </div>
    </Modal>
  );
}

export function ProjectsPage() {
  const { state } = useStore();
  const [kind, setKind] = useState<'all' | 'project' | 'goal'>('all');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('active');
  const [editing, setEditing] = useState<Project | null>(null);

  const shown = state.projects.filter((p) => (kind === 'all' || p.kind === kind) && (status === 'all' || p.status === status));
  const countStatus = (s: ProjectStatus) => state.projects.filter((p) => p.status === s).length;

  return (
    <>
      <div className="page-head">
        <div><h1>Projects & Goals</h1><div className="sub">{countStatus('active')} active · big things broken into steps, and numbers you’re working towards</div></div>
        <div className="row">
          <button className="btn" onClick={() => setEditing(blank('goal'))}><Icon name="plus" size={16} /> New Goal</button>
          <button className="btn btn-primary" onClick={() => setEditing(blank('project'))}><Icon name="plus" size={16} /> New Project</button>
        </div>
      </div>

      <div className="controls-row">
        <div className="pills">
          {([['all', 'All'], ['project', 'Projects'], ['goal', 'Goals']] as const).map(([k, l]) => <button key={k} className={'pill' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
        </div>
        <div className="pills">
          {([['active', 'Active'], ['paused', 'Paused'], ['done', 'Done'], ['all', 'Everything']] as const).map(([k, l]) => <button key={k} className={'pill' + (status === k ? ' on' : '')} onClick={() => setStatus(k)}>{l}{k !== 'all' && <span className="pill-n">{countStatus(k)}</span>}</button>)}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card"><EmptyState title="Nothing Here Yet">Start a project and break it into steps, or set a goal with a number to reach.</EmptyState></div>
      ) : (
        <div className="recipe-grid">
          {shown.map((p) => {
            const prog = projectProgress(p);
            return (
              <button key={p.id} className="recipe-card" onClick={() => setEditing(p)}>
                <h3>{p.title}</h3>
                <div className="recipe-meta" style={{ flexWrap: 'wrap' }}>
                  <span className="tag">{p.kind === 'goal' ? 'Goal' : 'Project'}</span>
                  {p.area && <span className="tag">{p.area}</span>}
                  {p.status !== 'active' && <span className="tag">{p.status === 'paused' ? 'Paused' : 'Done'}</span>}
                  {p.due && <span>By {fmtShort(p.due)}</span>}
                </div>
                <ProgressBar pct={prog.pct} />
                <div className="cov-text"><span>{prog.label}</span><span>{prog.pct}%</span></div>
              </button>
            );
          })}
        </div>
      )}
      {editing && <ProjectModal project={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

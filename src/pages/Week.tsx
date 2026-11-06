import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SLOTS, type Slot } from '../types';
import { addDays, fmtDay, fmtWeekRange, startOfWeek, today } from '../lib/dates';
import { buildShopping, recipeCoverage } from '../lib/shopping';
import { Icon, Modal } from '../components/ui';

export const DRAG_TYPE = 'application/x-recipe-id';
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function WeekPlanner() {
  const { state, actions } = useStore();
  const now = today();
  const [weekStart, setWeekStart] = useState(startOfWeek(now));
  const [adding, setAdding] = useState<{ date: string; slot: Slot } | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const from = weekStart > now ? weekStart : now;
  const to = addDays(weekStart, 6);
  const shop = useMemo(
    () => buildShopping({ plan: state.plan, recipes: state.recipes, pantry: state.pantry, manual: [], from, to, now }),
    [state.plan, state.recipes, state.pantry, from, to, now],
  );
  const plannedCount = days.reduce((n, d) => n + SLOTS.reduce((m, s) => m + (state.plan[d]?.[s]?.length ?? 0), 0), 0);
  const lastMonday = addDays(weekStart, -7);

  const copyLast = () => {
    if (plannedCount > 0 && !window.confirm('This replaces the meals already planned for this week. Carry on?')) return;
    actions.copyWeek(lastMonday, weekStart);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Meal Plan</h1>
          <div className="sub">Write meals in, or drag a recipe from the right onto a meal.</div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={copyLast}>Copy Last Week</button>
          <div className="week-nav">
            <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><Icon name="chevL" /></button>
            <div className="range">{fmtWeekRange(weekStart)}</div>
            <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><Icon name="chevR" /></button>
          </div>
          {weekStart !== startOfWeek(now) && <button className="btn btn-sm" onClick={() => setWeekStart(startOfWeek(now))}>This Week</button>}
        </div>
      </div>

      {shop.mealCount > 0 && (
        <div className="summary-bar">
          <span>{shop.mealCount} recipe {shop.mealCount === 1 ? 'meal' : 'meals'} planned</span>
          <span>·</span>
          <span>{shop.toBuy.length === 0 ? 'nothing to buy – you have it all' : `${shop.toBuy.length} ${shop.toBuy.length === 1 ? 'item' : 'items'} to buy`}</span>
          <a href="#/kitchen">Go To Kitchen</a>
        </div>
      )}

      <div className="week">
        <div className="week-head">
          <span />
          {SLOTS.map((s) => <span key={s}>{cap(s)}</span>)}
        </div>
        {days.map((date) => {
          const f = fmtDay(date);
          return (
            <div key={date} className={`day ${date === now ? 'is-today' : ''} ${date < now ? 'is-past' : ''}`}>
              <div className="day-label">
                <span className="dow">{f.dow}</span>
                <span className="num">{f.num}</span>
              </div>
              {SLOTS.map((slot) => (
                <MealCell key={slot} date={date} slot={slot} onAdd={() => setAdding({ date, slot })} />
              ))}
            </div>
          );
        })}
      </div>
      <p className="legend">
        <span className="dot dot-all" />you have everything
        <span className="dot dot-some" style={{ marginLeft: 16 }} />something to buy
      </p>

      {adding && <AddMealModal date={adding.date} slot={adding.slot} onClose={() => setAdding(null)} />}
    </>
  );
}

function MealCell({ date, slot, onAdd }: { date: string; slot: Slot; onAdd: () => void }) {
  const { state, actions } = useStore();
  const now = today();
  const [over, setOver] = useState(false);
  const f = fmtDay(date);

  return (
    <div
      className={`cell ${over ? 'drop-over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAG_TYPE);
        setOver(false);
        if (id && state.recipes.some((r) => r.id === id)) {
          e.preventDefault();
          actions.addMeal(date, slot, { kind: 'recipe', recipeId: id });
        }
      }}
    >
      <span className="cell-label">{cap(slot)}</span>
      {(state.plan[date]?.[slot] ?? []).map((e) => {
        if (e.kind === 'text') {
          return (
            <div className="meal is-text" key={e.id}>
              <span className="t">{e.text}</span>
              <button className="x" aria-label={`Remove ${e.text}`} onClick={() => actions.removeMeal(date, slot, e.id)}><Icon name="x" size={14} /></button>
            </div>
          );
        }
        const r = state.recipes.find((x) => x.id === e.recipeId);
        if (!r) return null;
        const cov = recipeCoverage(r, state.pantry, now);
        const all = cov.missing.length === 0;
        return (
          <div className="meal is-recipe" key={e.id} title={all ? 'You have everything' : `Missing: ${cov.missing.join(', ')}`}>
            <span className={`dot ${all ? 'dot-all' : 'dot-some'}`} />
            <a href={`#/plan/recipe/${r.id}`}>{r.name}</a>
            <button className="x" aria-label={`Remove ${r.name}`} onClick={() => actions.removeMeal(date, slot, e.id)}><Icon name="x" size={14} /></button>
          </div>
        );
      })}
      <button className="add-meal" onClick={onAdd} aria-label={`Add ${slot} on ${f.dow} ${f.num}`}>
        <Icon name="plus" size={13} /> Add
      </button>
    </div>
  );
}

function AddMealModal({ date, slot, onClose }: { date: string; slot: Slot; onClose: () => void }) {
  const { state, actions } = useStore();
  const now = today();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const f = fmtDay(date);
  const matches = state.recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())));
  // recipes tagged for this meal float to the top
  const sorted = [...matches].sort((a, b) => Number(b.tags.includes(slot)) - Number(a.tags.includes(slot)));

  const addText = () => {
    const t = text.trim();
    if (!t) return;
    actions.addMeal(date, slot, { kind: 'text', text: t });
    onClose();
  };

  return (
    <Modal title={`${cap(slot)} · ${f.dow} ${f.num} ${f.month}`} onClose={onClose}>
      <div className="stack">
        <form onSubmit={(e) => { e.preventDefault(); addText(); }} className="field">
          <span>Write It In</span>
          <div className="addbar" style={{ marginBottom: 0 }}>
            <input className="input" autoFocus placeholder="e.g. Leftovers, toast & eggs, out for dinner" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Add</button>
          </div>
        </form>
        <div className="field">
          <span>Or Choose A Recipe</span>
          <div className="searchbox" style={{ maxWidth: 'none' }}>
            <Icon name="search" size={16} />
            <input className="input" placeholder="Search recipes" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {state.recipes.length === 0 ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No recipes yet. <a href="#/plan/recipe/new" onClick={onClose} style={{ textDecoration: 'underline' }}>Add Your First Recipe</a>.</p>
        ) : (
          <div className="pick-list">
            {sorted.length === 0 && <div style={{ padding: 14, color: 'var(--muted)' }}>No recipes match.</div>}
            {sorted.map((r) => {
              const cov = recipeCoverage(r, state.pantry, now);
              return (
                <button key={r.id} className="pick" onClick={() => { actions.addMeal(date, slot, { kind: 'recipe', recipeId: r.id }); onClose(); }}>
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.time}{r.time && r.tags.length ? ' · ' : ''}{r.tags.join(', ')}</small>
                  </span>
                  <span className={`badge ${cov.missing.length === 0 ? 'badge-ok' : 'badge-soon'}`}>
                    {cov.missing.length === 0 ? 'All In' : `Need ${cov.missing.length}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

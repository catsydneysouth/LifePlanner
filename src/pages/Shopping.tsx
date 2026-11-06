import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { LOCATIONS, type Location, type ShoppingItem } from '../types';
import { addDays, today } from '../lib/dates';
import { buildShopping } from '../lib/shopping';
import { capitalise, formatQtyUnit, parseIngredientLine } from '../lib/units';
import { EmptyState, Icon, Modal } from '../components/ui';

const HORIZONS = [
  { label: 'Next 3 days', days: 3 },
  { label: 'Next 7 days', days: 7 },
  { label: 'Next 14 days', days: 14 },
];

export function ShoppingPage() {
  const { state, actions } = useStore();
  const now = today();
  const [horizon, setHorizon] = useState(7);
  const [draft, setDraft] = useState('');
  const [buying, setBuying] = useState(false);

  const result = useMemo(
    () => buildShopping({ plan: state.plan, recipes: state.recipes, pantry: state.pantry, manual: state.manual, from: now, to: addDays(now, horizon - 1), now }),
    [state.plan, state.recipes, state.pantry, state.manual, horizon, now],
  );

  const open = result.toBuy.filter((i) => !state.ticked[i.key]);
  const done = result.toBuy.filter((i) => state.ticked[i.key]);

  const addManual = () => {
    const ing = parseIngredientLine(draft);
    if (!ing) return;
    actions.addManual(ing.name, ing.qty, ing.unit);
    setDraft('');
  };

  const row = (i: ShoppingItem) => {
    const ticked = !!state.ticked[i.key];
    return (
      <div className={`shop-row ${ticked ? 'done' : ''}`} key={i.key}>
        <input type="checkbox" className="check" checked={ticked} onChange={(e) => actions.setTicked(i.key, e.target.checked)} aria-label={`Got ${i.name}`} />
        <div>
          <div>
            <span className="shop-name">{capitalise(i.name)}</span>
            {i.qty !== null && <span className="shop-qty">{formatQtyUnit(i.qty, i.unit)}</span>}
          </div>
          <div className="for">
            {i.manual ? <span className="you">added by you</span> : (
              <>
                <span>for</span>
                {i.forRecipes.map((r) => <span className="r" key={r}>{r}</span>)}
              </>
            )}
          </div>
          {i.note && <div className="note">{i.note}</div>}
        </div>
        {i.manual && i.manualId ? (
          <button className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => actions.deleteManual(i.manualId!)}><Icon name="trash" size={16} /></button>
        ) : <span />}
      </div>
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Shopping list</h1>
          <div className="sub">
            {result.mealCount === 0 ? 'Plan some recipe meals and what you need appears here.' : `Worked out from ${result.mealCount} planned ${result.mealCount === 1 ? 'meal' : 'meals'}, minus what’s in your pantry.`}
          </div>
        </div>
        <div className="pills">
          {HORIZONS.map((h) => (
            <button key={h.days} className={`pill ${horizon === h.days ? 'on' : ''}`} onClick={() => setHorizon(h.days)}>{h.label}</button>
          ))}
        </div>
      </div>

      <form className="addbar" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
        <input className="input" placeholder="Add anything else: “2 kitchen rolls”, “washing-up liquid”" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" type="submit" disabled={!draft.trim()}><Icon name="plus" size={16} /> Add</button>
      </form>

      {result.toBuy.length === 0 ? (
        <div className="card">
          <EmptyState title={result.mealCount > 0 ? 'You have everything' : 'Nothing to buy yet'}>
            {result.mealCount > 0 ? 'Every ingredient for the meals you’ve planned is already in your pantry.' : 'Add recipes to your meal plan, or type something above.'}
          </EmptyState>
        </div>
      ) : (
        <div className="card">
          {open.map(row)}
          {done.length > 0 && (
            <>
              <div style={{ padding: '10px 16px', background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Got it</div>
              {done.map(row)}
            </>
          )}
        </div>
      )}

      {done.length > 0 && (
        <div className="actionbar">
          <span>{done.length} ticked off</span>
          <button className="btn" style={{ color: 'var(--ink)' }} onClick={() => setBuying(true)}>Put away in pantry…</button>
        </div>
      )}

      {result.covered.length > 0 && (
        <details className="covered">
          <summary>Already covered by your pantry ({result.covered.length})</summary>
          <div className="card" style={{ marginTop: 8 }}>
            {result.covered.map((c) => (
              <div className="covered-row" key={c.name}>
                <span>{capitalise(c.name)} <small>· for {c.forRecipes.join(', ')}</small></span>
                <small>{c.have}</small>
              </div>
            ))}
          </div>
        </details>
      )}

      {buying && <PutAwayModal items={done} onClose={() => setBuying(false)} />}
    </>
  );
}

function PutAwayModal({ items, onClose }: { items: ShoppingItem[]; onClose: () => void }) {
  const { actions } = useStore();
  const [rows, setRows] = useState(() => items.map((i) => ({ key: i.key, name: i.name, qty: i.qty, unit: i.unit, manualId: i.manualId, location: 'cupboard' as Location | 'skip', expiry: '' })));
  const patch = (idx: number, p: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...p } : x)));

  const confirm = () => {
    // Non-food items (cleaning stuff etc.) can be marked "Don't add to pantry" and are just cleared off the list
    const toPantry = rows.flatMap((r) => (r.location === 'skip' ? [] : [{ name: r.name, qty: r.qty, unit: r.unit, location: r.location, expiry: r.expiry }]));
    actions.addPantryItems(toPantry);
    rows.forEach((r) => r.manualId && actions.deleteManual(r.manualId));
    actions.clearTicked(rows.map((r) => r.key));
    onClose();
  };

  return (
    <Modal title="Put away your shopping" onClose={onClose} wide>
      <p style={{ margin: '0 0 12px', color: 'var(--ink-2)' }}>Say where each thing lives and when it goes off. Leave the date blank for long-life items.</p>
      <div className="stack">
        {rows.map((r, idx) => (
          <div key={r.key} className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 550, marginBottom: 8 }}>{capitalise(r.name)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{formatQtyUnit(r.qty, r.unit)}</span></div>
            <div className="grid-2">
              <select className="select" value={r.location} onChange={(e) => patch(idx, { location: e.target.value as Location | 'skip' })} aria-label={`Where ${r.name} lives`}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                <option value="skip">Don’t add to pantry</option>
              </select>
              <input className="input" type="date" value={r.expiry} onChange={(e) => patch(idx, { expiry: e.target.value })} disabled={r.location === 'skip'} aria-label={`Use-by date for ${r.name}`} />
            </div>
          </div>
        ))}
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={confirm}>Put away {rows.length}</button>
        </div>
      </div>
    </Modal>
  );
}

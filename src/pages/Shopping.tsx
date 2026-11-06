import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { LOCATIONS, type Location, type ShoppingItem } from '../types';
import { addDays, today } from '../lib/dates';
import { buildShopping, namesMatch } from '../lib/shopping';
import { capitalise, formatQtyUnit, parseIngredientLine } from '../lib/units';
import { EmptyState, Icon } from '../components/ui';

/** The list covers the next 7 days of planned meals. (A range selector was tried and removed; see notes.) */
const HORIZON_DAYS = 7;

export function ShoppingPanel({ onBought }: { onBought: (ids: string[]) => void }) {
  const { state, actions } = useStore();
  const now = today();
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [location, setLocation] = useState<Location>('cupboard');
  const [expiry, setExpiry] = useState('');

  const result = useMemo(
    () => buildShopping({ plan: state.plan, recipes: state.recipes, pantry: state.pantry, manual: state.manual, from: now, to: addDays(now, HORIZON_DAYS - 1), now }),
    [state.plan, state.recipes, state.pantry, state.manual, now],
  );

  const addManual = () => {
    const ing = parseIngredientLine(draft);
    if (!ing) return;
    actions.addManual(ing.name, ing.qty, ing.unit);
    setDraft('');
  };

  const startBuying = (i: ShoppingItem) => {
    // If you already keep this somewhere, suggest the same place
    const known = state.pantry.find((p) => namesMatch(p.name, i.name));
    setLocation(known?.location ?? 'cupboard');
    setExpiry('');
    setConfirming(i.key);
  };

  const confirmBought = (i: ShoppingItem) => {
    const ids = actions.addPantryItems([{ name: capitalise(i.name), qty: i.qty, unit: i.unit, location, expiry }]);
    if (i.manual && i.manualId) actions.deleteManual(i.manualId);
    setConfirming(null);
    onBought(ids);
  };

  const row = (i: ShoppingItem) => {
    const open = confirming === i.key;
    return (
      <div className={`shop-row ${open ? 'confirming' : ''}`} key={i.key}>
        <input type="checkbox" className="check" checked={open} onChange={() => (open ? setConfirming(null) : startBuying(i))} aria-label={`I bought ${i.name}`} />
        <div>
          <div>
            <span className="shop-name">{capitalise(i.name)}</span>
            {i.qty !== null && <span className="shop-qty">{i.detail && !i.manual ? 'buy ' : ''}{formatQtyUnit(i.qty, i.unit)}</span>}
          </div>
          <div className="for">
            {i.manual ? <span className="you">added by you</span> : (
              <>
                <span>for</span>
                {i.forRecipes.map((r) => <span className="r" key={r}>{r}</span>)}
              </>
            )}
          </div>
          {i.detail && <div className="note">{i.detail}</div>}
          {open && (
            <form className="bought-form" onSubmit={(e) => { e.preventDefault(); confirmBought(i); }}>
              <label className="field"><span>It Goes In</span>
                <select className="select" value={location} onChange={(e) => setLocation(e.target.value as Location)}>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                </select>
              </label>
              <label className="field"><span>Use By (Optional)</span>
                <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </label>
              <div className="bought-actions">
                <button type="submit" className="btn btn-primary btn-sm" autoFocus>Yes, I Bought It</button>
                <button type="button" className="btn btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
        {i.manual && i.manualId && !open ? (
          <button className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => actions.deleteManual(i.manualId!)}><Icon name="trash" size={16} /></button>
        ) : <span />}
      </div>
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Shopping List</h2>
          <div className="panel-sub">
            {result.mealCount === 0 ? 'Plan some recipe meals and what you need appears here.' : `For your next 7 days of meals (${result.mealCount} planned), minus what’s in your pantry.`}
          </div>
        </div>
      </div>
      <form className="addbar" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
        <input className="input" placeholder="Add anything else, e.g. 2 kitchen rolls" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn" type="submit" disabled={!draft.trim()}><Icon name="plus" size={16} /> Add</button>
      </form>

      {result.toBuy.length === 0 ? (
        <div className="card">
          <EmptyState title={result.mealCount > 0 ? 'You Have Everything' : 'Nothing To Buy Yet'}>
            {result.mealCount > 0 ? 'Every ingredient for your planned meals is already in the pantry.' : 'Add recipes to your meal plan, or type something above.'}
          </EmptyState>
        </div>
      ) : (
        <div className="card scrolls">{result.toBuy.map(row)}</div>
      )}

      {result.covered.length > 0 && (
        <details className="covered">
          <summary>Already Covered By Your Pantry ({result.covered.length})</summary>
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
    </section>
  );
}

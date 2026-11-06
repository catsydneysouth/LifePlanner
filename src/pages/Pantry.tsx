import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { LOCATIONS, type Location, type PantryItem } from '../types';
import { daysBetween, expiryInfo, today } from '../lib/dates';
import { suggestUseItUp } from '../lib/shopping';
import { capitalise, formatQtyUnit, parseIngredientBlock } from '../lib/units';
import { COMMON_UNITS, EmptyState, ExpiryBadge, Icon, Modal } from '../components/ui';

type Filter = 'all' | Location;

/** The "Use It Up" banner that sits full width above the shopping list and pantry. */
export function UseItUpBanner({ onEdit }: { onEdit: (item: PantryItem) => void }) {
  const { state } = useStore();
  const now = today();
  const urgent = useMemo(
    () => state.pantry.filter((p) => p.expiry && daysBetween(now, p.expiry) <= 2).sort((a, b) => a.expiry.localeCompare(b.expiry)),
    [state.pantry, now],
  );
  const suggestions = useMemo(() => suggestUseItUp(state.recipes, state.pantry, now).slice(0, 4), [state.recipes, state.pantry, now]);
  if (urgent.length === 0) return null;

  return (
    <section className="use-banner">
      <h2><Icon name="clock" size={20} /> Use It Up</h2>
      <div className="use-grid">
        <div>
          <h4>Going Off Soon</h4>
          <div className="chips">
            {urgent.map((p) => (
              <button key={p.id} className="chip" onClick={() => onEdit(p)} style={{ cursor: 'pointer' }}>
                {p.name} <small>{expiryInfo(p.expiry, now).label.toLowerCase()}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4>Recipes That Would Use Some Of It</h4>
          {suggestions.length === 0 ? (
            <p className="use-none">Nothing in your recipes uses these yet.</p>
          ) : (
            <div className="chips">
              {suggestions.map((s) => (
                <a key={s.recipe.id} className="chip" href={`#/recipes/${s.recipe.id}`}>
                  {s.recipe.name} <small>uses {s.uses.join(', ').toLowerCase()}</small>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function PantryPanel({ flashIds, onEdit, onBulk }: { flashIds: string[]; onEdit: (item: PantryItem | 'new') => void; onBulk: () => void }) {
  const { state, actions } = useStore();
  const now = today();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const shown = state.pantry
    .filter((p) => (filter === 'all' || p.location === filter) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      // things you've just put away sit at the top for a moment so you can see them arrive
      const fa = flashIds.includes(a.id) ? 0 : 1;
      const fb = flashIds.includes(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ea = a.expiry || '9999-99-99';
      const eb = b.expiry || '9999-99-99';
      return ea === eb ? a.name.localeCompare(b.name) : ea.localeCompare(eb);
    });

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Pantry</h2>
          <div className="panel-sub">{state.pantry.length} {state.pantry.length === 1 ? 'item' : 'items'} · earliest dates first</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={onBulk}><Icon name="upload" size={14} /> Add Many</button>
          <button className="btn btn-primary btn-sm" onClick={() => onEdit('new')}><Icon name="plus" size={14} /> Add Item</button>
        </div>
      </div>

      <div className="addbar addbar-3">
        <div className="searchbox" style={{ maxWidth: 'none' }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Search your pantry" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Where it is kept">
          <option value="all">Everywhere</option>
          {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={state.pantry.length === 0 ? 'Nothing In The Pantry Yet' : 'Nothing Matches'}
            action={state.pantry.length === 0 ? <button className="btn btn-primary" onClick={onBulk}>Add A Bunch At Once</button> : undefined}
          >
            {state.pantry.length === 0 ? 'Paste a list, one item per line, and say where it lives and when it expires.' : 'Try a different search or location.'}
          </EmptyState>
        </div>
      ) : (
        <div className="card list scrolls">
          {shown.map((p) => (
            <div className={`item ${flashIds.includes(p.id) ? 'flash' : ''}`} key={p.id}>
              <div>
                <div className="item-name">{p.name}</div>
                <div className="item-meta">
                  <span>{formatQtyUnit(p.qty, p.unit) || 'some'}</span>
                  <span>·</span>
                  <span className="loc">{p.location}</span>
                </div>
              </div>
              <div className="item-actions">
                <ExpiryBadge expiry={p.expiry} now={now} />
                <button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)}><Icon name="edit" size={16} /></button>
                <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => actions.deletePantryItem(p.id)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ItemModal({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(item?.name ?? '');
  const [qty, setQty] = useState(item?.qty === null || item?.qty === undefined ? '' : String(item.qty));
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [location, setLocation] = useState<Location>(item?.location ?? 'fridge');
  const [expiry, setExpiry] = useState(item?.expiry ?? '');

  const save = () => {
    if (!name.trim()) return;
    const n = qty.trim() === '' ? null : Number(qty.replace(',', '.'));
    actions.savePantryItem({ id: item?.id, name: capitalise(name.trim()), qty: n !== null && Number.isFinite(n) ? n : null, unit: unit.trim().toLowerCase(), location, expiry });
    onClose();
  };

  return (
    <Modal title={item ? 'Edit Item' : 'Add To Pantry'} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Thighs" /></label>
        <div className="grid-2">
          <label className="field"><span>Amount</span><input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Empty means “some”" /></label>
          <label className="field"><span>Unit</span>
            <input className="input" list="units" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, tin… or blank" />
            <datalist id="units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
          </label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Where Is It</span>
            <select className="select" value={location} onChange={(e) => setLocation(e.target.value as Location)}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </label>
          <label className="field"><span>Use By / Best Before</span><input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
        </div>
        <div className="modal-foot">
          {item && <button type="button" className="btn btn-danger spread" onClick={() => { actions.deletePantryItem(item.id); onClose(); }}>Remove</button>}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function BulkModal({ onClose }: { onClose: () => void }) {
  const { actions } = useStore();
  const [text, setText] = useState('');
  const [location, setLocation] = useState<Location>('fridge');
  const [expiry, setExpiry] = useState('');
  const parsed = useMemo(() => parseIngredientBlock(text), [text]);

  const add = () => {
    if (parsed.length === 0) return;
    actions.addPantryItems(parsed.map((p) => ({ name: capitalise(p.name), qty: p.qty, unit: p.unit, location, expiry })));
    onClose();
  };

  return (
    <Modal title="Add Many At Once" onClose={onClose} wide>
      <div className="stack">
        <label className="field">
          <span>One Item Per Line</span>
          <textarea className="textarea" autoFocus style={{ minHeight: 150 }} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'6 eggs\n500g mince\n2 tins chopped tomatoes\n1.5 litres milk\ncheddar'} />
        </label>
        <div className="grid-2">
          <label className="field"><span>These Live In</span>
            <select className="select" value={location} onChange={(e) => setLocation(e.target.value as Location)}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </label>
          <label className="field"><span>Use By (Optional, For All)</span><input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
        </div>
        {parsed.length > 0 && (
          <div>
            <div className="mini-label">I’ll Add {parsed.length} {parsed.length === 1 ? 'Item' : 'Items'}</div>
            <div className="preview-chips">
              {parsed.map((p, i) => <span key={i}>{[formatQtyUnit(p.qty, p.unit), p.name].filter(Boolean).join(' ')}</span>)}
            </div>
          </div>
        )}
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={parsed.length === 0} onClick={add}>Add {parsed.length || ''}</button>
        </div>
      </div>
    </Modal>
  );
}

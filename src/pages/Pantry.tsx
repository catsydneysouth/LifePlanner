import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { LOCATIONS, type Location, type PantryItem } from '../types';
import { daysBetween, expiryInfo, today } from '../lib/dates';
import { suggestUseItUp } from '../lib/shopping';
import { formatQtyUnit, parseIngredientBlock } from '../lib/units';
import { COMMON_UNITS, EmptyState, ExpiryBadge, Icon, Modal } from '../components/ui';

type Filter = 'all' | Location;

export function PantryPage() {
  const { state, actions } = useStore();
  const now = today();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<PantryItem | 'new' | null>(null);
  const [bulk, setBulk] = useState(false);

  const urgent = useMemo(
    () => state.pantry.filter((p) => p.expiry && daysBetween(now, p.expiry) <= 2).sort((a, b) => a.expiry.localeCompare(b.expiry)),
    [state.pantry, now],
  );
  const suggestions = useMemo(() => suggestUseItUp(state.recipes, state.pantry, now).slice(0, 4), [state.recipes, state.pantry, now]);

  const shown = state.pantry
    .filter((p) => (filter === 'all' || p.location === filter) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const ea = a.expiry || '9999-99-99';
      const eb = b.expiry || '9999-99-99';
      return ea === eb ? a.name.localeCompare(b.name) : ea.localeCompare(eb);
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pantry</h1>
          <div className="sub">{state.pantry.length} {state.pantry.length === 1 ? 'item' : 'items'} · sorted by what needs eating first</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setBulk(true)}><Icon name="upload" size={16} /> Add many</button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> Add item</button>
        </div>
      </div>

      {urgent.length > 0 && (
        <div className="callout">
          <h3><Icon name="clock" size={18} /> Use it up</h3>
          <div className="chips">
            {urgent.map((p) => (
              <button key={p.id} className="chip" onClick={() => setEditing(p)} style={{ cursor: 'pointer' }}>
                {p.name} <small>{expiryInfo(p.expiry, now).label.toLowerCase()}</small>
              </button>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="suggest">
              <h4>Recipes that would use some of it</h4>
              <div className="chips">
                {suggestions.map((s) => (
                  <a key={s.recipe.id} className="chip" href={`#/recipes/${s.recipe.id}`}>
                    {s.recipe.name} <small>uses {s.uses.join(', ').toLowerCase()}</small>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ marginBottom: 14 }}>
        <div className="searchbox">
          <Icon name="search" size={16} />
          <input className="input" placeholder="Search your pantry" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="pills">
          {(['all', ...LOCATIONS] as Filter[]).map((f) => (
            <button key={f} className={`pill ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={state.pantry.length === 0 ? 'Nothing in the pantry yet' : 'Nothing matches'}
            action={state.pantry.length === 0 ? <button className="btn btn-primary" onClick={() => setBulk(true)}>Add a bunch at once</button> : undefined}
          >
            {state.pantry.length === 0 ? 'Paste a list, one item per line, and set where it lives and when it expires.' : 'Try a different search or location.'}
          </EmptyState>
        </div>
      ) : (
        <div className="card list">
          {shown.map((p) => (
            <div className="item" key={p.id}>
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
                <button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Icon name="edit" size={16} /></button>
                <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => actions.deletePantryItem(p.id)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ItemModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {bulk && <BulkModal onClose={() => setBulk(false)} />}
    </>
  );
}

function ItemModal({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(item?.name ?? '');
  const [qty, setQty] = useState(item?.qty === null || item?.qty === undefined ? '' : String(item.qty));
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [location, setLocation] = useState<Location>(item?.location ?? 'fridge');
  const [expiry, setExpiry] = useState(item?.expiry ?? '');

  const save = () => {
    if (!name.trim()) return;
    const n = qty.trim() === '' ? null : Number(qty.replace(',', '.'));
    actions.savePantryItem({ id: item?.id, name: name.trim(), qty: n !== null && Number.isFinite(n) ? n : null, unit: unit.trim().toLowerCase(), location, expiry });
    onClose();
  };

  return (
    <Modal title={item ? 'Edit item' : 'Add to pantry'} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken thighs" /></label>
        <div className="grid-2">
          <label className="field"><span>Amount</span><input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Leave empty for “some”" /></label>
          <label className="field"><span>Unit</span>
            <input className="input" list="units" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, tin… or blank" />
            <datalist id="units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
          </label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Where is it</span>
            <select className="select" value={location} onChange={(e) => setLocation(e.target.value as Location)}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </label>
          <label className="field"><span>Use by / best before</span><input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
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

function BulkModal({ onClose }: { onClose: () => void }) {
  const { actions } = useStore();
  const [text, setText] = useState('');
  const [location, setLocation] = useState<Location>('fridge');
  const [expiry, setExpiry] = useState('');
  const parsed = useMemo(() => parseIngredientBlock(text), [text]);

  const add = () => {
    if (parsed.length === 0) return;
    actions.addPantryItems(parsed.map((p) => ({ name: p.name, qty: p.qty, unit: p.unit, location, expiry })));
    onClose();
  };

  return (
    <Modal title="Add many at once" onClose={onClose} wide>
      <div className="stack">
        <label className="field">
          <span>One item per line</span>
          <textarea className="textarea" autoFocus style={{ minHeight: 150 }} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'6 eggs\n500g mince\n2 tins chopped tomatoes\n1.5 litres milk\ncheddar'} />
        </label>
        <div className="grid-2">
          <label className="field"><span>These live in</span>
            <select className="select" value={location} onChange={(e) => setLocation(e.target.value as Location)}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </label>
          <label className="field"><span>Use by (optional, applies to all)</span><input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
        </div>
        {parsed.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>I’ll add {parsed.length} {parsed.length === 1 ? 'item' : 'items'}</div>
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

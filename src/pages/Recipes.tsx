import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SLOTS, type Recipe, type Slot } from '../types';
import { today } from '../lib/dates';
import { namesMatch, recipeCoverage, usablePantry } from '../lib/shopping';
import { formatIngredient, parseIngredientBlock } from '../lib/units';
import { EmptyState, Icon, Modal } from '../components/ui';

export function RecipesPage({ openId }: { openId: string | null }) {
  const { state } = useStore();
  const now = today();
  const [q, setQ] = useState('');

  const closeModal = () => { window.location.hash = '#/recipes'; };
  const recipes = state.recipes
    .filter((r) => [r.name, ...r.tags].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const open = openId && openId !== 'new' ? state.recipes.find((r) => r.id === openId) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recipes</h1>
          <div className="sub">{state.recipes.length} saved · the bar shows how much of each you already have</div>
        </div>
        <div className="row">
          <div className="searchbox">
            <Icon name="search" size={16} />
            <input className="input" placeholder="Search recipes or tags" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <a className="btn btn-primary" href="#/recipes/new"><Icon name="plus" size={16} /> New recipe</a>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="card">
          <EmptyState title={state.recipes.length === 0 ? 'No recipes yet' : 'Nothing matches'} action={state.recipes.length === 0 ? <a className="btn btn-primary" href="#/recipes/new">Add your first recipe</a> : undefined}>
            Save the meals you cook so you can drop them into the plan and get the shopping list for free.
          </EmptyState>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((r) => {
            const cov = recipeCoverage(r, state.pantry, now);
            const pct = cov.total ? Math.round((cov.have / cov.total) * 100) : 0;
            return (
              <a key={r.id} href={`#/recipes/${r.id}`} className="recipe-card">
                <h3>{r.name}</h3>
                <div className="recipe-meta">
                  {r.time && <span><Icon name="clock" size={14} />{r.time}</span>}
                  <span><Icon name="users" size={14} />{r.servings}</span>
                </div>
                {r.tags.length > 0 && <div className="row" style={{ gap: 6 }}>{r.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>}
                <div>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                  <div className="cov-text" style={{ marginTop: 6 }}>
                    <span>{cov.have} of {cov.total} ingredients in</span>
                    <span style={{ color: cov.missing.length === 0 ? 'var(--accent)' : 'var(--muted)' }}>{cov.missing.length === 0 ? 'Ready to cook' : `Need ${cov.missing.length}`}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {open && <RecipeDetail recipe={open} onClose={closeModal} onEdit={() => { window.location.hash = `#/recipes/${open.id}/edit`; }} />}
      {openId === 'new' && <RecipeForm onClose={closeModal} onSaved={(id) => { window.location.hash = `#/recipes/${id}`; }} />}
      {openId?.endsWith('/edit') && (() => {
        const r = state.recipes.find((x) => x.id === openId.replace('/edit', ''));
        return r ? <RecipeForm recipe={r} onClose={() => { window.location.hash = `#/recipes/${r.id}`; }} onSaved={(id) => { window.location.hash = `#/recipes/${id}`; }} /> : null;
      })()}
    </>
  );
}

function RecipeDetail({ recipe, onClose, onEdit }: { recipe: Recipe; onClose: () => void; onEdit: () => void }) {
  const { state, actions } = useStore();
  const now = today();
  const stock = usablePantry(state.pantry, now);
  const [planning, setPlanning] = useState(false);
  const [date, setDate] = useState(now);
  const [slot, setSlot] = useState<Slot>(recipe.tags.includes('breakfast') ? 'breakfast' : recipe.tags.includes('lunch') ? 'lunch' : 'dinner');
  const [added, setAdded] = useState(false);

  const add = () => {
    actions.addMeal(date, slot, { kind: 'recipe', recipeId: recipe.id });
    setAdded(true);
    setPlanning(false);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <Modal title={recipe.name} onClose={onClose} wide>
      <div className="stack">
        <div className="recipe-meta">
          {recipe.time && <span><Icon name="clock" size={14} />{recipe.time}</span>}
          <span><Icon name="users" size={14} />Serves {recipe.servings}</span>
          {recipe.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
        </div>

        <div>
          <h3 style={{ marginBottom: 6 }}>Ingredients</h3>
          <ul className="ing-list">
            {recipe.ingredients.map((i, idx) => {
              const have = stock.some((p) => namesMatch(p.name, i.name));
              return (
                <li key={idx} className={have ? 'have' : 'need'}>
                  <span className="mark"><Icon name={have ? 'check' : 'plus'} size={12} /></span>
                  <span>{formatIngredient(i)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: have ? 'var(--accent)' : 'var(--terra)' }}>{have ? 'in stock' : 'to buy'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {recipe.method && (
          <div>
            <h3 style={{ marginBottom: 6 }}>Method</h3>
            <div className="method">{recipe.method}</div>
          </div>
        )}

        {planning && (
          <div className="card" style={{ padding: 14 }}>
            <div className="grid-2">
              <label className="field"><span>Day</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value || now)} /></label>
              <label className="field"><span>Meal</span>
                <select className="select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
                  {SLOTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-foot" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => setPlanning(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add}>Add to plan</button>
            </div>
          </div>
        )}

        <div className="modal-foot">
          <button className="btn btn-danger spread" onClick={() => { if (window.confirm(`Delete “${recipe.name}”? It will also be removed from any planned meals.`)) { actions.deleteRecipe(recipe.id); onClose(); } }}>Delete</button>
          <button className="btn" onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>
          <button className="btn btn-primary" onClick={() => setPlanning(true)}><Icon name="week" size={16} /> {added ? 'Added ✓' : 'Plan this meal'}</button>
        </div>
      </div>
    </Modal>
  );
}

function RecipeForm({ recipe, onClose, onSaved }: { recipe?: Recipe; onClose: () => void; onSaved: (id: string) => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(String(recipe?.servings ?? 2));
  const [time, setTime] = useState(recipe?.time ?? '');
  const [tags, setTags] = useState((recipe?.tags ?? []).join(', '));
  const [ingText, setIngText] = useState((recipe?.ingredients ?? []).map(formatIngredient).join('\n'));
  const [method, setMethod] = useState(recipe?.method ?? '');
  const parsed = useMemo(() => parseIngredientBlock(ingText), [ingText]);

  const save = () => {
    if (!name.trim()) return;
    const id = actions.saveRecipe({
      id: recipe?.id,
      name: name.trim(),
      servings: Math.max(1, Math.round(Number(servings)) || 1),
      time: time.trim(),
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      ingredients: parsed,
      method: method.trim(),
    });
    onSaved(id);
  };

  return (
    <Modal title={recipe ? 'Edit recipe' : 'New recipe'} onClose={onClose} wide>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken & chickpea curry" /></label>
        <div className="grid-3">
          <label className="field"><span>Tags (comma separated)</span><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, veggie, quick" /></label>
          <label className="field"><span>Time</span><input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="30 min" /></label>
          <label className="field"><span>Serves</span><input className="input" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
        </div>
        <label className="field">
          <span>Ingredients, one per line</span>
          <textarea className="textarea" style={{ minHeight: 150 }} value={ingText} onChange={(e) => setIngText(e.target.value)} placeholder={'400g chopped tomatoes\n2 garlic cloves\n1 tsp cumin\nolive oil'} />
        </label>
        {parsed.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>How I’ve read them</div>
            <div className="preview-chips">{parsed.map((p, i) => <span key={i}>{formatIngredient(p)}</span>)}</div>
          </div>
        )}
        <label className="field"><span>Method (optional)</span><textarea className="textarea" value={method} onChange={(e) => setMethod(e.target.value)} /></label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Save recipe</button>
        </div>
      </form>
    </Modal>
  );
}

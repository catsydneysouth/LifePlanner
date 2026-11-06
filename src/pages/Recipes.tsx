import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SLOTS, type Recipe, type Slot } from '../types';
import { today } from '../lib/dates';
import { namesMatch, recipeCoverage, usablePantry } from '../lib/shopping';
import { formatIngredient, parseIngredientBlock, titleCase } from '../lib/units';
import { EmptyState, Icon, Modal } from '../components/ui';
import { DRAG_TYPE } from './Week';

const PLAN = '#/plan';

/** The recipes list that sits beside the meal plan. Recipes can be dragged onto any meal. */
export function RecipesPanel() {
  const { state } = useStore();
  const now = today();
  const [q, setQ] = useState('');
  const recipes = state.recipes
    .filter((r) => [r.name, ...r.tags].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recipes</h2>
        <a className="btn btn-primary btn-sm" href="#/plan/recipe/new"><Icon name="plus" size={14} /> New Recipe</a>
      </div>
      <div className="searchbox" style={{ maxWidth: 'none', marginBottom: 10 }}>
        <Icon name="search" size={16} />
        <input className="input" placeholder="Search recipes or tags" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="drag-hint">Drag a recipe onto a meal, or use Add on the meal.</p>

      {recipes.length === 0 ? (
        <EmptyState title={state.recipes.length === 0 ? 'No Recipes Yet' : 'Nothing Matches'}>
          {state.recipes.length === 0 ? 'Save the meals you cook, then drop them into your week.' : 'Try a different search.'}
        </EmptyState>
      ) : (
        <div className="recipe-list">
          {recipes.map((r) => {
            const cov = recipeCoverage(r, state.pantry, now);
            const pct = cov.total ? Math.round((cov.have / cov.total) * 100) : 0;
            return (
              <a
                key={r.id}
                href={`#/plan/recipe/${r.id}`}
                className="recipe-row"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, r.id);
                  e.dataTransfer.setData('text/plain', r.name);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <div className="recipe-row-top">
                  <strong>{r.name}</strong>
                  <span className={`badge ${cov.missing.length === 0 ? 'badge-ok' : 'badge-none'}`}>{cov.missing.length === 0 ? 'Ready' : `Need ${cov.missing.length}`}</span>
                </div>
                <div className="recipe-meta">
                  {r.time && <span><Icon name="clock" size={13} />{r.time}</span>}
                  <span><Icon name="users" size={13} />{r.servings}</span>
                </div>
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Opens the right recipe window from the web address: #/plan/recipe/<id>, /new, or /<id>/edit */
export function RecipeModals({ arg }: { arg: string | null }) {
  const { state } = useStore();
  if (!arg || !arg.startsWith('recipe/')) return null;
  const rest = arg.slice('recipe/'.length);
  const close = () => { window.location.hash = PLAN; };
  if (rest === 'new') return <RecipeForm onClose={close} onSaved={(id) => { window.location.hash = `${PLAN}/recipe/${id}`; }} />;
  if (rest.endsWith('/edit')) {
    const r = state.recipes.find((x) => x.id === rest.replace('/edit', ''));
    return r ? <RecipeForm recipe={r} onClose={() => { window.location.hash = `${PLAN}/recipe/${r.id}`; }} onSaved={(id) => { window.location.hash = `${PLAN}/recipe/${id}`; }} /> : null;
  }
  const r = state.recipes.find((x) => x.id === rest);
  return r ? <RecipeDetail recipe={r} onClose={close} onEdit={() => { window.location.hash = `${PLAN}/recipe/${r.id}/edit`; }} /> : null;
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
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: have ? 'var(--accent)' : 'var(--terra)' }}>{have ? 'In Stock' : 'To Buy'}</span>
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
              <button className="btn btn-primary" onClick={add}>Add To Plan</button>
            </div>
          </div>
        )}

        <div className="modal-foot">
          <button className="btn btn-danger spread" onClick={() => { if (window.confirm(`Delete “${recipe.name}”? It will also be removed from any planned meals.`)) { actions.deleteRecipe(recipe.id); onClose(); } }}>Delete</button>
          <button className="btn" onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>
          <button className="btn btn-primary" onClick={() => setPlanning(true)}><Icon name="week" size={16} /> {added ? 'Added ✓' : 'Plan This Meal'}</button>
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
      name: titleCase(name.trim()),
      servings: Math.max(1, Math.round(Number(servings)) || 1),
      time: time.trim(),
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      ingredients: parsed,
      method: method.trim(),
    });
    onSaved(id);
  };

  return (
    <Modal title={recipe ? 'Edit Recipe' : 'New Recipe'} onClose={onClose} wide>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken & Chickpea Curry" /></label>
        <div className="grid-3">
          <label className="field"><span>Tags (comma separated)</span><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, veggie, quick" /></label>
          <label className="field"><span>Time</span><input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="30 min" /></label>
          <label className="field"><span>Serves</span><input className="input" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
        </div>
        <label className="field">
          <span>Ingredients, One Per Line</span>
          <textarea className="textarea" style={{ minHeight: 150 }} value={ingText} onChange={(e) => setIngText(e.target.value)} placeholder={'400g chopped tomatoes\n2 garlic cloves\n1 tsp cumin\nolive oil'} />
        </label>
        {parsed.length > 0 && (
          <div>
            <div className="mini-label">How I’ve Read Them</div>
            <div className="preview-chips">{parsed.map((p, i) => <span key={i}>{formatIngredient(p)}</span>)}</div>
          </div>
        )}
        <label className="field"><span>Method (Optional)</span><textarea className="textarea" value={method} onChange={(e) => setMethod(e.target.value)} /></label>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Save Recipe</button>
        </div>
      </form>
    </Modal>
  );
}

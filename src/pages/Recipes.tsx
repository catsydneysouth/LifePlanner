import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SLOTS, type Recipe, type Slot } from '../types';
import { today } from '../lib/dates';
import { namesMatch, recipeCoverage, usablePantry } from '../lib/shopping';
import { formatIngredient, parseIngredientBlock, titleCase } from '../lib/units';
import { EmptyState, Icon, Modal } from '../components/ui';
import { DRAG_TYPE } from './Week';


/** The recipes list that sits beside the meal plan. Recipes can be dragged onto any meal. */
export function RecipesPanel() {
  const { state } = useStore();
  const now = today();
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState<'all' | Slot>('all');
  const recipes = state.recipes
    .filter((r) => (meal === 'all' || r.tags.includes(meal)) && [r.name, ...r.tags].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recipes</h2>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn btn-sm" href="#/recipes">Browse All</a>
          <a className="btn btn-primary btn-sm" href="#/plan/recipe/new"><Icon name="plus" size={14} /> New</a>
        </div>
      </div>
      <div className="searchbox" style={{ maxWidth: 'none', marginBottom: 10 }}>
        <Icon name="search" size={16} />
        <input className="input" placeholder="Search recipes or tags" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pills" style={{ marginBottom: 10 }}>
        {(['all', ...SLOTS] as const).map((m) => (
          <button key={m} className={`pill ${meal === m ? 'on' : ''}`} onClick={() => setMeal(m)}>{m === 'all' ? 'All' : m[0].toUpperCase() + m.slice(1)}</button>
        ))}
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

/**
 * Opens the right recipe window from the web address.
 * `rest` is "new", "<id>" or "<id>/edit". `basePath` is where recipe addresses live, `closePath` is where closing returns to.
 */
export function RecipeModals({ rest, basePath, closePath }: { rest: string | null; basePath: string; closePath: string }) {
  const { state } = useStore();
  if (!rest) return null;
  const close = () => { window.location.hash = closePath; };
  const open = (id: string) => { window.location.hash = `${basePath}/${id}`; };
  if (rest === 'new') return <RecipeForm onClose={close} onSaved={open} />;
  if (rest.endsWith('/edit')) {
    const r = state.recipes.find((x) => x.id === rest.replace('/edit', ''));
    return r ? <RecipeForm recipe={r} onClose={() => open(r.id)} onSaved={open} /> : null;
  }
  const r = state.recipes.find((x) => x.id === rest);
  return r ? <RecipeDetail recipe={r} onClose={close} onEdit={() => { window.location.hash = `${basePath}/${r.id}/edit`; }} /> : null;
}

/** The full Recipes page: search, filter by tag, sort, and a card for each recipe. Built for hundreds of recipes. */
export function RecipesPage({ arg }: { arg: string | null }) {
  const { state } = useStore();
  const now = today();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<'az' | 'ready'>('az');

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    state.recipes.forEach((r) => r.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [state.recipes]);

  const rows = useMemo(() => {
    const withCov = state.recipes
      .filter((r) => (tag === 'all' || r.tags.includes(tag)) && [r.name, ...r.tags, ...r.ingredients.map((i) => i.name)].join(' ').toLowerCase().includes(q.toLowerCase()))
      .map((r) => ({ r, cov: recipeCoverage(r, state.pantry, now) }));
    withCov.sort((a, b) => {
      if (sort === 'ready') {
        const pa = a.cov.total ? a.cov.have / a.cov.total : 0;
        const pb = b.cov.total ? b.cov.have / b.cov.total : 0;
        if (pa !== pb) return pb - pa;
      }
      return a.r.name.localeCompare(b.r.name);
    });
    return withCov;
  }, [state.recipes, state.pantry, tag, q, sort, now]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recipes</h1>
          <div className="sub">{state.recipes.length} saved · search by name, tag or ingredient</div>
        </div>
        <a className="btn btn-primary" href="#/recipes/new"><Icon name="plus" size={16} /> New Recipe</a>
      </div>

      <div className="controls-row">
        <div className="searchbox" style={{ maxWidth: 'none', flex: 1 }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Search recipes, tags or ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as 'az' | 'ready')} aria-label="Sort recipes">
          <option value="az">Sort: A To Z</option>
          <option value="ready">Sort: Ready To Cook First</option>
        </select>
      </div>
      {tags.length > 0 && (
        <div className="pills" style={{ marginBottom: 18 }}>
          <button className={`pill ${tag === 'all' ? 'on' : ''}`} onClick={() => setTag('all')}>All</button>
          {tags.map(([t, n]) => (
            <button key={t} className={`pill ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>{t[0].toUpperCase() + t.slice(1)} <span className="pill-n">{n}</span></button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState title={state.recipes.length === 0 ? 'No Recipes Yet' : 'Nothing Matches'} action={state.recipes.length === 0 ? <a className="btn btn-primary" href="#/recipes/new">Add Your First Recipe</a> : undefined}>
            {state.recipes.length === 0 ? 'Save the meals you cook so you can drop them into your week and get the shopping list for free.' : 'Try a different search or tag.'}
          </EmptyState>
        </div>
      ) : (
        <div className="recipe-grid">
          {rows.map(({ r, cov }) => {
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
                    <span style={{ color: cov.missing.length === 0 ? 'var(--accent)' : 'var(--muted)' }}>{cov.missing.length === 0 ? 'Ready To Cook' : `Need ${cov.missing.length}`}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
      <RecipeModals rest={arg} basePath="#/recipes" closePath="#/recipes" />
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { Icon } from './components/ui';
import { PlanPage } from './pages/Plan';
import { KitchenPage } from './pages/Kitchen';
import { RecipesPage } from './pages/Recipes';
import { TodayPage } from './pages/Today';
import { TodosPage } from './pages/Todos';
import { CalendarPage } from './pages/Calendar';
import { ProjectsPage } from './pages/Projects';
import { HabitsPage } from './pages/Habits';
import { HomePage } from './pages/Home';
import { TravelPage } from './pages/Travel';
import { MoneyPage } from './pages/Money';
import { exportBackup, parseBackup } from './lib/storage';
import { buildShopping } from './lib/shopping';
import { addDays, today } from './lib/dates';

const PAGES = ['today', 'todos', 'calendar', 'projects', 'habits', 'home', 'travel', 'money', 'plan', 'recipes', 'kitchen'] as const;
type Route = { page: (typeof PAGES)[number]; arg: string | null };

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const page = PAGES.find((p) => p === parts[0]) ?? 'today';
  const arg = parts.length > 1 ? parts.slice(1).join('/') : null;
  return { page, arg: arg || null };
}

type IconKey = 'sun' | 'list' | 'calendar' | 'flag' | 'pulse' | 'home' | 'plane' | 'coin' | 'week' | 'recipes' | 'pantry';
const GROUPS: { heading: string; items: { page: (typeof PAGES)[number]; label: string; icon: IconKey }[] }[] = [
  { heading: 'Planner', items: [
    { page: 'today', label: 'Today', icon: 'sun' },
    { page: 'todos', label: 'To-Dos', icon: 'list' },
    { page: 'calendar', label: 'Calendar', icon: 'calendar' },
    { page: 'projects', label: 'Projects & Goals', icon: 'flag' },
  ] },
  { heading: 'Life', items: [
    { page: 'habits', label: 'Habits & Fitness', icon: 'pulse' },
    { page: 'home', label: 'Home', icon: 'home' },
    { page: 'travel', label: 'Travel', icon: 'plane' },
    { page: 'money', label: 'Money', icon: 'coin' },
  ] },
  { heading: 'Food', items: [
    { page: 'plan', label: 'Meal Plan', icon: 'week' },
    { page: 'recipes', label: 'Recipes', icon: 'recipes' },
    { page: 'kitchen', label: 'Kitchen', icon: 'pantry' },
  ] },
];
// the five most-used pages sit in the phone's bottom bar; everything else is under "More"
const BOTTOM: (typeof PAGES)[number][] = ['today', 'todos', 'calendar', 'plan', 'kitchen'];
const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

export function App() {
  const { state, actions } = useStore();
  const [route, setRoute] = useState<Route>(parseHash);
  const [toast, setToast] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = () => {
      const next = parseHash();
      // only jump to the top when you change page, not when a recipe window opens
      setMoreOpen(false);
      setRoute((prev) => { if (prev.page !== next.page) window.scrollTo({ top: 0 }); return next; });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const now = today();
  const toBuyCount = useMemo(
    () => buildShopping({ plan: state.plan, recipes: state.recipes, pantry: state.pantry, manual: state.manual, from: now, to: addDays(now, 6), now }).toBuy.length,
    [state.plan, state.recipes, state.pantry, state.manual, now],
  );

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = parseBackup(await file.text());
      if (!window.confirm('Replace everything in your planner on this device with that backup?')) return;
      actions.replaceAll(next);
      setToast('Backup restored');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not read that file');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const linkFor = (p: string) => `#/${p}`;
  const navLink = (n: { page: string; label: string; icon: IconKey }) => (
    <a key={n.page} href={linkFor(n.page)} className={route.page === n.page ? 'active' : ''} aria-current={route.page === n.page ? 'page' : undefined}>
      <Icon name={n.icon} /> {n.label}
      {n.page === 'kitchen' && toBuyCount > 0 && <span className="count">{toBuyCount}</span>}
    </a>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="leaf" size={18} /></span>Life Planner</div>
        <nav className="nav" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.heading} className="nav-group">
              <div className="nav-heading">{g.heading}</div>
              {g.items.map(navLink)}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="link-btn" onClick={() => { exportBackup(state); setToast('Backup downloaded'); }}><Icon name="download" size={16} /> Download Backup</button>
          <button className="link-btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Restore Backup</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </aside>

      <main className="main">
        {state.isSample && (
          <div className="sample-banner">
            <span>You’re looking at sample data so you can see how it all fits together.</span>
            <button className="btn btn-sm" onClick={() => { if (window.confirm('Remove all the sample data (recipes, pantry, meals, to-dos, events, projects, habits, trips, money and so on) and start with a blank planner?')) actions.clearSample(); }}>Clear It And Start Fresh</button>
          </div>
        )}
        {route.page === 'today' && <TodayPage />}
        {route.page === 'todos' && <TodosPage />}
        {route.page === 'calendar' && <CalendarPage />}
        {route.page === 'projects' && <ProjectsPage />}
        {route.page === 'habits' && <HabitsPage />}
        {route.page === 'home' && <HomePage />}
        {route.page === 'travel' && <TravelPage arg={route.arg} />}
        {route.page === 'money' && <MoneyPage />}
        {route.page === 'plan' && <PlanPage arg={route.arg} />}
        {route.page === 'recipes' && <RecipesPage arg={route.arg} />}
        {route.page === 'kitchen' && <KitchenPage />}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {ALL_ITEMS.filter((n) => BOTTOM.includes(n.page)).map((n) => (
          <a key={n.page} href={linkFor(n.page)} className={route.page === n.page ? 'active' : ''}>
            <Icon name={n.icon} size={20} />
            {n.label}
            {n.page === 'kitchen' && toBuyCount > 0 && <span className="count">{toBuyCount}</span>}
          </a>
        ))}
        <button className={'more-btn' + (moreOpen || !BOTTOM.includes(route.page) ? ' active' : '')} onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
          <Icon name="more" size={20} />
          More
        </button>
      </nav>
      {moreOpen && (
        <div className="more-sheet" onClick={() => setMoreOpen(false)}>
          <div className="more-card" onClick={(e) => e.stopPropagation()}>
            {GROUPS.map((g) => (
              <div key={g.heading}>
                <div className="nav-heading">{g.heading}</div>
                {g.items.map((n) => (
                  <a key={n.page} href={linkFor(n.page)} className={route.page === n.page ? 'active' : ''}><Icon name={n.icon} /> {n.label}</a>
                ))}
              </div>
            ))}
            <div className="sidebar-foot" style={{ marginTop: 8 }}>
              <button className="link-btn" onClick={() => { exportBackup(state); setMoreOpen(false); setToast('Backup downloaded'); }}><Icon name="download" size={16} /> Download Backup</button>
              <button className="link-btn" onClick={() => { setMoreOpen(false); fileRef.current?.click(); }}><Icon name="upload" size={16} /> Restore Backup</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

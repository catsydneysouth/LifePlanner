import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { Icon } from './components/ui';
import { PlanPage } from './pages/Plan';
import { KitchenPage } from './pages/Kitchen';
import { exportBackup, parseBackup } from './lib/storage';
import { buildShopping } from './lib/shopping';
import { addDays, today } from './lib/dates';

type Route = { page: 'plan' | 'kitchen'; arg: string | null };

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const page = (['plan', 'kitchen'] as const).find((p) => p === parts[0]) ?? 'plan';
  const arg = parts.length > 1 ? parts.slice(1).join('/') : null;
  return { page, arg: arg || null };
}

const NAV = [
  { page: 'plan', label: 'Meal Plan', icon: 'week' },
  { page: 'kitchen', label: 'Kitchen', icon: 'pantry' },
] as const;

export function App() {
  const { state, actions } = useStore();
  const [route, setRoute] = useState<Route>(parseHash);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = () => {
      const next = parseHash();
      // only jump to the top when you change page, not when a recipe window opens
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="leaf" size={18} /></span>Life Planner</div>
        <nav className="nav" aria-label="Main">
          <div className="nav-heading">Food</div>
          {NAV.map((n) => (
            <a key={n.page} href={linkFor(n.page)} className={route.page === n.page ? 'active' : ''} aria-current={route.page === n.page ? 'page' : undefined}>
              <Icon name={n.icon} /> {n.label}
              {n.page === 'kitchen' && toBuyCount > 0 && <span className="count">{toBuyCount}</span>}
            </a>
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
            <button className="btn btn-sm" onClick={() => { if (window.confirm('Remove all the sample recipes, pantry items and meals and start with a blank planner?')) actions.clearSample(); }}>Clear It And Start Fresh</button>
          </div>
        )}
        {route.page === 'plan' && <PlanPage arg={route.arg} />}
        {route.page === 'kitchen' && <KitchenPage />}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.page} href={linkFor(n.page)} className={route.page === n.page ? 'active' : ''}>
            <Icon name={n.icon} size={20} />
            {n.label}
            {n.page === 'kitchen' && toBuyCount > 0 && <span className="count">{toBuyCount}</span>}
          </a>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

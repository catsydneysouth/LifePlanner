import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppState, CalEvent, Ingredient, ManualItem, MealEntry, PantryItem, Recipe, Slot, Task } from './types';
import { localStorageAdapter, type Storage } from './lib/storage';
import { emptyState, makeSampleState } from './lib/sample';
import { addDays } from './lib/dates';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export interface Actions {
  addMeal(date: string, slot: Slot, entry: { kind: 'text'; text: string } | { kind: 'recipe'; recipeId: string }): void;
  removeMeal(date: string, slot: Slot, entryId: string): void;
  copyWeek(fromMonday: string, toMonday: string): void;
  savePantryItem(item: Omit<PantryItem, 'id'> & { id?: string }): void;
  addPantryItems(items: Omit<PantryItem, 'id'>[]): string[];
  deletePantryItem(id: string): void;
  saveRecipe(r: Omit<Recipe, 'id'> & { id?: string }): string;
  deleteRecipe(id: string): void;
  addManual(name: string, qty: number | null, unit: string): void;
  deleteManual(id: string): void;
  saveTask(t: Omit<Task, 'id' | 'done'> & { id?: string; done?: boolean }): string;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  clearDoneTasks(): void;
  saveEvent(e: Omit<CalEvent, 'id'> & { id?: string }): string;
  deleteEvent(id: string): void;
  replaceAll(state: AppState): void;
  clearSample(): void;
}

interface Ctx {
  state: AppState;
  actions: Actions;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children, storage = localStorageAdapter }: { children: ReactNode; storage?: Storage }) {
  const [state, setState] = useState<AppState>(() => storage.load() ?? makeSampleState());

  useEffect(() => {
    storage.save(state);
  }, [state, storage]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const actions = useMemo<Actions>(
    () => ({
      addMeal(date, slot, entry) {
        update((s) => {
          const day = { ...(s.plan[date] ?? {}) };
          const list: MealEntry[] = [...(day[slot] ?? []), { id: uid(), ...entry } as MealEntry];
          day[slot] = list;
          return { ...s, plan: { ...s.plan, [date]: day } };
        });
      },
      removeMeal(date, slot, entryId) {
        update((s) => {
          const day = { ...(s.plan[date] ?? {}) };
          day[slot] = (day[slot] ?? []).filter((e) => e.id !== entryId);
          return { ...s, plan: { ...s.plan, [date]: day } };
        });
      },
      copyWeek(fromMonday, toMonday) {
        update((s) => {
          const plan = { ...s.plan };
          for (let i = 0; i < 7; i++) {
            const f = addDays(fromMonday, i);
            const t = addDays(toMonday, i);
            const src = s.plan[f];
            if (!src) continue;
            const copy: Record<string, MealEntry[]> = {};
            for (const slot of ['breakfast', 'lunch', 'dinner'] as Slot[]) {
              copy[slot] = (src[slot] ?? []).map((e) => ({ ...e, id: uid() }));
            }
            plan[t] = copy;
          }
          return { ...s, plan };
        });
      },
      savePantryItem(item) {
        update((s) => {
          if (item.id) return { ...s, pantry: s.pantry.map((p) => (p.id === item.id ? { ...(item as PantryItem) } : p)) };
          return { ...s, pantry: [...s.pantry, { ...item, id: uid() }] };
        });
      },
      addPantryItems(items) {
        const withIds = items.map((i) => ({ ...i, id: uid() }));
        update((s) => ({ ...s, pantry: [...s.pantry, ...withIds] }));
        return withIds.map((i) => i.id);
      },
      deletePantryItem(id) {
        update((s) => ({ ...s, pantry: s.pantry.filter((p) => p.id !== id) }));
      },
      saveRecipe(r) {
        const rid = r.id ?? uid();
        update((s) => {
          const full: Recipe = { ...r, id: rid, ingredients: r.ingredients as Ingredient[] };
          return s.recipes.some((x) => x.id === rid)
            ? { ...s, recipes: s.recipes.map((x) => (x.id === rid ? full : x)) }
            : { ...s, recipes: [...s.recipes, full] };
        });
        return rid;
      },
      deleteRecipe(id) {
        update((s) => {
          // remove it from any planned meals too, so nothing points at a missing recipe
          const plan = { ...s.plan };
          for (const date of Object.keys(plan)) {
            const day = { ...plan[date] };
            for (const slot of ['breakfast', 'lunch', 'dinner'] as Slot[]) {
              if (day[slot]) day[slot] = day[slot]!.filter((e) => !(e.kind === 'recipe' && e.recipeId === id));
            }
            plan[date] = day;
          }
          return { ...s, plan, recipes: s.recipes.filter((r) => r.id !== id) };
        });
      },
      addManual(name, qty, unit) {
        const item: ManualItem = { id: uid(), name, qty, unit };
        update((s) => ({ ...s, manual: [...s.manual, item] }));
      },
      deleteManual(id) {
        update((s) => ({ ...s, manual: s.manual.filter((m) => m.id !== id) }));
      },
      saveTask(t) {
        const tid = t.id ?? uid();
        update((s) => {
          const existing = s.tasks.find((x) => x.id === tid);
          const full: Task = { ...t, id: tid, done: t.done ?? existing?.done ?? false };
          return existing ? { ...s, tasks: s.tasks.map((x) => (x.id === tid ? full : x)) } : { ...s, tasks: [...s.tasks, full] };
        });
        return tid;
      },
      toggleTask(id) {
        update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
      },
      deleteTask(id) {
        update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      },
      clearDoneTasks() {
        update((s) => ({ ...s, tasks: s.tasks.filter((t) => !t.done) }));
      },
      saveEvent(e) {
        const eid = e.id ?? uid();
        update((s) => {
          const full: CalEvent = { ...e, id: eid };
          return s.events.some((x) => x.id === eid)
            ? { ...s, events: s.events.map((x) => (x.id === eid ? full : x)) }
            : { ...s, events: [...s.events, full] };
        });
        return eid;
      },
      deleteEvent(id) {
        update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
      },
      replaceAll(next) {
        setState(next);
      },
      clearSample() {
        setState(emptyState());
      },
    }),
    [update],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

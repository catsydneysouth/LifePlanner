import type { AppState } from '../types';

/**
 * Everything the app saves goes through this one interface.
 * To move to a database later (Supabase, Firebase, Base44...), write a second
 * implementation of Storage and pass it to <StoreProvider storage={...}> – no screen changes needed.
 */
export interface Storage {
  load(): AppState | null;
  save(state: AppState): void;
}

const KEY = 'lifeplanner.food.v1';

export const localStorageAdapter: Storage = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      return parsed && parsed.version === 1 ? normalise(parsed) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked – the in-memory state still works this session */
    }
  },
};

/** Fill in anything an older save is missing, so new sections never break old data. */
export function normalise(data: Partial<AppState>): AppState {
  return {
    version: 1,
    recipes: data.recipes ?? [],
    pantry: data.pantry ?? [],
    plan: data.plan ?? {},
    manual: data.manual ?? [],
    tasks: data.tasks ?? [],
    events: data.events ?? [],
    projects: data.projects ?? [],
    habits: data.habits ?? [],
    workouts: data.workouts ?? [],
    chores: data.chores ?? [],
    trips: data.trips ?? [],
    expenses: data.expenses ?? [],
    bills: data.bills ?? [],
    savings: data.savings ?? [],
    budgets: data.budgets ?? {},
    isSample: data.isSample ?? false,
  };
}

export function exportBackup(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `life-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): AppState {
  const data = JSON.parse(text) as Partial<AppState>;
  if (!data || data.version !== 1 || !Array.isArray(data.recipes) || !Array.isArray(data.pantry) || typeof data.plan !== 'object') {
    throw new Error('That file does not look like a Life Planner backup.');
  }
  return { ...normalise(data), isSample: false };
}

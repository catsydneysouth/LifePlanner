export type Slot = 'breakfast' | 'lunch' | 'dinner';
export const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner'];

export type Location = 'fridge' | 'freezer' | 'cupboard' | 'other';
export const LOCATIONS: Location[] = ['fridge', 'freezer', 'cupboard', 'other'];

export interface Ingredient {
  name: string;
  /** null = "some" / to taste (salt, oil) */
  qty: number | null;
  /** '' means a plain count (3 eggs) */
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  time: string; // free text, e.g. "35 min"
  tags: string[];
  ingredients: Ingredient[];
  method: string;
}

export interface PantryItem {
  id: string;
  name: string;
  qty: number | null;
  unit: string;
  location: Location;
  /** yyyy-mm-dd, empty = no date (long-life) */
  expiry: string;
}

export type MealEntry =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'recipe'; recipeId: string };

/** date (yyyy-mm-dd) -> slot -> entries */
export type Plan = Record<string, Partial<Record<Slot, MealEntry[]>>>;

export interface ManualItem {
  id: string;
  name: string;
  qty: number | null;
  unit: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  due: string; // YYYY-MM-DD, or '' for no date
  project: string; // free-text label, or ''
  priority: boolean; // true = flagged as important
  notes: string;
}

/** A calendar entry that lives in this planner (Google Calendar events will be added alongside these later). */
export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  start: string; // HH:MM, or ''
  end: string; // HH:MM, or ''
  notes: string;
}

export interface Step { id: string; text: string; done: boolean }
export type ProjectStatus = 'active' | 'paused' | 'done';
/** A project (a set of steps) or a goal (a steps list and/or a number to reach, like 500 km). */
export interface Project {
  id: string;
  kind: 'project' | 'goal';
  title: string;
  area: string;
  status: ProjectStatus;
  due: string;
  notes: string;
  steps: Step[];
  target: number | null;
  current: number;
  unit: string;
}

export interface Habit { id: string; name: string; days: number[]; log: string[] } // days: 0 = Monday ... 6 = Sunday
export interface Workout { id: string; date: string; type: string; minutes: number | null; km: number | null; notes: string }
export interface Chore { id: string; title: string; area: string; everyDays: number; last: string }

export interface Trip {
  id: string;
  name: string;
  destination: string;
  start: string;
  end: string;
  status: 'idea' | 'planned' | 'booked' | 'done';
  notes: string;
  itinerary: { id: string; date: string; text: string }[];
  bookings: { id: string; what: string; ref: string; date: string }[];
  packing: { id: string; text: string; packed: boolean }[];
}

export interface Expense { id: string; date: string; amount: number; category: string; note: string }
export interface Bill { id: string; name: string; amount: number; day: number }
export interface SavingsGoal { id: string; name: string; target: number; saved: number; due: string }

export const MONEY_CATEGORIES = ['Groceries', 'Eating Out', 'Transport', 'Home', 'Fun', 'Health', 'Other'];

export interface AppState {
  version: 1;
  recipes: Recipe[];
  pantry: PantryItem[];
  plan: Plan;
  manual: ManualItem[];
  tasks: Task[];
  events: CalEvent[];
  projects: Project[];
  habits: Habit[];
  workouts: Workout[];
  chores: Chore[];
  trips: Trip[];
  expenses: Expense[];
  bills: Bill[];
  savings: SavingsGoal[];
  budgets: Record<string, number>; // monthly budget per spending category
  isSample: boolean;
}

export interface ShoppingItem {
  key: string;
  name: string;
  qty: number | null;
  unit: string;
  /** recipe names this is needed for */
  forRecipes: string[];
  manual: boolean;
  manualId?: string;
  /** plain-English explanation, e.g. "You need 1kg in total and have 600g." */
  detail?: string;
}

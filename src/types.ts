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

export interface AppState {
  version: 1;
  recipes: Recipe[];
  pantry: PantryItem[];
  plan: Plan;
  manual: ManualItem[];
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

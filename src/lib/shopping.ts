import type { Plan, Recipe, PantryItem, ManualItem, ShoppingItem, Slot } from '../types';
import { SLOTS } from '../types';
import { addDays, daysBetween } from './dates';
import { formatQtyUnit, fromBase, normName, toBase } from './units';

/** Two food names refer to the same thing if equal, or one is a more specific form of the other
 *  ("tomato" ~ "chopped tomato") – but "cherry tomato" and "chopped tomato" stay different. */
export function namesMatch(a: string, b: string): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(' ');
  const wb = nb.split(' ');
  if (wa[wa.length - 1] !== wb[wb.length - 1]) return false;
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return short.every((w) => long.includes(w));
}

/** Pantry items that are still in date today (no date = fine). */
export function usablePantry(pantry: PantryItem[], now: string): PantryItem[] {
  return pantry.filter((p) => !p.expiry || daysBetween(now, p.expiry) >= 0);
}

export interface PlannedMeal {
  date: string;
  slot: Slot;
  recipe: Recipe;
}

export function plannedRecipes(plan: Plan, recipes: Recipe[], fromIso: string, toIso: string): PlannedMeal[] {
  const out: PlannedMeal[] = [];
  const byId = new Map(recipes.map((r) => [r.id, r]));
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) {
    const day = plan[d];
    if (!day) continue;
    for (const slot of SLOTS) {
      for (const e of day[slot] ?? []) {
        if (e.kind !== 'recipe') continue;
        const recipe = byId.get(e.recipeId);
        if (recipe) out.push({ date: d, slot, recipe });
      }
    }
  }
  return out;
}

interface Need {
  norm: string;
  name: string;
  /** base-unit quantity; null = unspecified amount */
  qty: number | null;
  unit: string;
  forRecipes: Set<string>;
}

export interface CoveredItem {
  name: string;
  have: string;
  forRecipes: string[];
}

export interface ShoppingResult {
  toBuy: ShoppingItem[];
  covered: CoveredItem[];
  mealCount: number;
}

export function buildShopping(args: {
  plan: Plan;
  recipes: Recipe[];
  pantry: PantryItem[];
  manual: ManualItem[];
  from: string;
  to: string;
  now: string;
}): ShoppingResult {
  const { plan, recipes, pantry, manual, from, to, now } = args;
  const meals = plannedRecipes(plan, recipes, from, to);
  const needs = new Map<string, Need>();

  for (const m of meals) {
    for (const ing of m.recipe.ingredients) {
      const norm = normName(ing.name);
      if (!norm) continue;
      const base = ing.qty === null ? null : toBase(ing.qty, ing.unit);
      const unit = base ? base.unit : '?';
      const key = `${norm}|${unit}`;
      const cur = needs.get(key);
      if (cur) {
        if (base && cur.qty !== null) cur.qty += base.qty;
        cur.forRecipes.add(m.recipe.name);
      } else {
        needs.set(key, {
          norm,
          name: ing.name.trim(),
          qty: base ? base.qty : null,
          unit: base ? base.unit : '',
          forRecipes: new Set([m.recipe.name]),
        });
      }
    }
  }

  // Fold "some salt" (no amount) into a measured "salt" row if there is one
  for (const [key, n] of [...needs]) {
    if (n.qty !== null) continue;
    const sibling = [...needs.values()].find((o) => o !== n && o.qty !== null && o.norm === n.norm);
    if (sibling) {
      n.forRecipes.forEach((r) => sibling.forRecipes.add(r));
      needs.delete(key);
    }
  }

  const stock = usablePantry(pantry, now);
  const toBuy: ShoppingItem[] = [];
  const covered: CoveredItem[] = [];

  for (const n of needs.values()) {
    const matches = stock.filter((p) => namesMatch(p.name, n.name));
    const forRecipes = [...n.forRecipes];

    if (n.qty === null) {
      if (matches.length > 0) {
        covered.push({ name: n.name, have: 'in your pantry', forRecipes });
      } else {
        toBuy.push({ key: `auto:${n.norm}|?`, name: n.name, qty: null, unit: '', forRecipes, manual: false });
      }
      continue;
    }

    // Sum same-unit stock (after base conversion); unspecified-amount stock counts as "plenty"
    let have = 0;
    let plenty = false;
    const otherUnits: string[] = [];
    for (const p of matches) {
      if (p.qty === null) {
        plenty = true;
        continue;
      }
      const pb = toBase(p.qty, p.unit);
      if (pb.unit === n.unit) have += pb.qty;
      else otherUnits.push(formatQtyUnit(p.qty, p.unit));
    }

    if (plenty || have >= n.qty) {
      const shown = fromBase(have, n.unit);
      covered.push({ name: n.name, have: plenty && have === 0 ? 'in your pantry' : `${formatQtyUnit(shown.qty, shown.unit)} in stock`, forRecipes });
      continue;
    }

    const missing = n.qty - have;
    const shownMissing = fromBase(missing, n.unit);
    let note: string | undefined;
    if (have > 0) {
      const shownHave = fromBase(have, n.unit);
      note = `You have ${formatQtyUnit(shownHave.qty, shownHave.unit)}`;
    } else if (otherUnits.length > 0) {
      note = `You have ${otherUnits.join(' + ')} (different units, so not counted)`;
    }
    toBuy.push({
      key: `auto:${n.norm}|${n.unit}`,
      name: n.name,
      qty: shownMissing.qty,
      unit: shownMissing.unit,
      forRecipes,
      manual: false,
      note,
    });
  }

  for (const m of manual) {
    toBuy.push({ key: `manual:${m.id}`, name: m.name, qty: m.qty, unit: m.unit, forRecipes: [], manual: true, manualId: m.id });
  }

  toBuy.sort((a, b) => a.name.localeCompare(b.name));
  covered.sort((a, b) => a.name.localeCompare(b.name));
  return { toBuy, covered, mealCount: meals.length };
}

export function recipeCoverage(recipe: Recipe, pantry: PantryItem[], now: string): { have: number; total: number; missing: string[] } {
  const stock = usablePantry(pantry, now);
  const missing: string[] = [];
  let have = 0;
  for (const ing of recipe.ingredients) {
    if (stock.some((p) => namesMatch(p.name, ing.name))) have += 1;
    else missing.push(ing.name);
  }
  return { have, total: recipe.ingredients.length, missing };
}

export interface UseItUpSuggestion {
  recipe: Recipe;
  uses: string[]; // expiring pantry item names this recipe would use
  have: number;
  total: number;
}

/** Recipes that would use up food expiring within `withinDays` days. */
export function suggestUseItUp(recipes: Recipe[], pantry: PantryItem[], now: string, withinDays = 4): UseItUpSuggestion[] {
  const expiring = pantry.filter((p) => p.expiry && daysBetween(now, p.expiry) >= 0 && daysBetween(now, p.expiry) <= withinDays);
  const out: UseItUpSuggestion[] = [];
  for (const recipe of recipes) {
    const uses = expiring.filter((p) => recipe.ingredients.some((i) => namesMatch(i.name, p.name))).map((p) => p.name);
    if (uses.length === 0) continue;
    const cov = recipeCoverage(recipe, pantry, now);
    out.push({ recipe, uses, have: cov.have, total: cov.total });
  }
  out.sort((a, b) => b.uses.length - a.uses.length || b.have / b.total - a.have / a.total);
  return out;
}

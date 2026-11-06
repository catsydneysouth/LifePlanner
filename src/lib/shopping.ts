import type { Plan, Recipe, PantryItem, ManualItem, ShoppingItem, Slot } from '../types';
import { SLOTS } from '../types';
import { addDays, daysBetween, fmtDay } from './dates';
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

interface StockEntry {
  item: PantryItem;
  /** base unit ('' = plain count) */
  unit: string;
  /** quantity still unspoken for, in base units */
  left: number;
  /** quantity when we started, in base units */
  initial: number;
  /** true when the pantry says "some" without an amount */
  plenty: boolean;
}

interface Agg {
  norm: string;
  name: string;
  unit: string;
  needTotal: number;
  buy: number;
  buyUnspecified: boolean;
  forAll: Set<string>;
  forBuy: Set<string>;
  /** first meal date that could not use stock because it would be out of date */
  goesOffBefore: string;
}

const EPS = 0.0001;

/**
 * Works through the planned meals in date order and takes each ingredient from pantry stock that is
 * still in date on that meal's day (earliest-expiring first). Whatever is left over is what you need to buy.
 * So chicken that goes off tomorrow is not counted for a curry planned next Tuesday.
 */
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

  const stock: StockEntry[] = usablePantry(pantry, now).map((p) => {
    if (p.qty === null) return { item: p, unit: '', left: 0, initial: 0, plenty: true };
    const b = toBase(p.qty, p.unit);
    return { item: p, unit: b.unit, left: b.qty, initial: b.qty, plenty: false };
  });
  const validOn = (e: StockEntry, date: string) => !e.item.expiry || e.item.expiry >= date;

  const aggs = new Map<string, Agg>();
  for (const meal of meals) {
    for (const ing of meal.recipe.ingredients) {
      const norm = normName(ing.name);
      if (!norm) continue;
      const base = ing.qty === null ? null : toBase(ing.qty, ing.unit);
      const key = `${norm}|${base ? base.unit : '?'}`;
      let agg = aggs.get(key);
      if (!agg) {
        agg = { norm, name: ing.name.trim(), unit: base ? base.unit : '?', needTotal: 0, buy: 0, buyUnspecified: false, forAll: new Set(), forBuy: new Set(), goesOffBefore: '' };
        aggs.set(key, agg);
      }
      agg.forAll.add(meal.recipe.name);

      const matches = stock.filter((e) => namesMatch(e.item.name, ing.name));
      const valid = matches.filter((e) => validOn(e, meal.date));

      if (!base) {
        if (valid.length === 0) {
          agg.buyUnspecified = true;
          agg.forBuy.add(meal.recipe.name);
          if (!agg.goesOffBefore && matches.length > 0) agg.goesOffBefore = meal.date;
        }
        continue;
      }

      agg.needTotal += base.qty;
      let remaining = base.qty;
      if (valid.some((e) => e.plenty)) {
        remaining = 0;
      } else {
        const usable = valid
          .filter((e) => e.unit === base.unit)
          .sort((x, y) => (x.item.expiry || '9999-99-99').localeCompare(y.item.expiry || '9999-99-99'));
        for (const e of usable) {
          const take = Math.min(e.left, remaining);
          e.left -= take;
          remaining -= take;
          if (remaining <= EPS) break;
        }
      }
      if (remaining > EPS) {
        agg.buy += remaining;
        agg.forBuy.add(meal.recipe.name);
        const lost = matches.find((e) => e.unit === base.unit && !e.plenty && e.left > EPS && e.item.expiry && e.item.expiry < meal.date);
        if (lost && !agg.goesOffBefore) agg.goesOffBefore = meal.date;
      }
    }
  }

  // "some salt" (no amount) folds into a measured "salt" row if there is one
  for (const [key, a] of [...aggs]) {
    if (a.unit !== '?') continue;
    const sibling = [...aggs.values()].find((o) => o !== a && o.unit !== '?' && o.norm === a.norm);
    if (sibling) {
      a.forAll.forEach((r) => sibling.forAll.add(r));
      if (a.buyUnspecified && sibling.buy > EPS) a.forBuy.forEach((r) => sibling.forBuy.add(r));
      aggs.delete(key);
    }
  }

  const toBuy: ShoppingItem[] = [];
  const covered: CoveredItem[] = [];
  const dayLabel = (iso: string) => {
    const f = fmtDay(iso);
    return `${f.dow} ${f.num} ${f.month}`;
  };

  for (const a of aggs.values()) {
    const matches = stock.filter((e) => namesMatch(e.item.name, a.name));

    if (a.unit === '?') {
      if (a.buyUnspecified) {
        toBuy.push({
          key: `auto:${a.norm}|?`, name: a.name, qty: null, unit: '', forRecipes: [...a.forBuy], manual: false,
          detail: a.goesOffBefore ? `What you have goes off before ${dayLabel(a.goesOffBefore)}.` : undefined,
        });
      } else {
        covered.push({ name: a.name, have: 'in your pantry', forRecipes: [...a.forAll] });
      }
      continue;
    }

    const haveBase = matches.filter((e) => e.unit === a.unit && !e.plenty).reduce((n, e) => n + e.initial, 0);
    const hasPlenty = matches.some((e) => e.plenty);

    if (a.buy > EPS) {
      const buy = fromBase(a.buy, a.unit);
      const sentences: string[] = [];
      if (haveBase > EPS) {
        const need = fromBase(a.needTotal, a.unit);
        const have = fromBase(haveBase, a.unit);
        sentences.push(`You need ${formatQtyUnit(need.qty, need.unit)} in total and have ${formatQtyUnit(have.qty, have.unit)}.`);
      } else {
        const others = matches.filter((e) => e.unit !== a.unit && !e.plenty).map((e) => formatQtyUnit(e.item.qty, e.item.unit));
        if (others.length > 0) sentences.push(`You have ${others.join(' + ')} (different units, so not counted).`);
      }
      if (a.goesOffBefore) sentences.push(`What you have goes off before ${dayLabel(a.goesOffBefore)}.`);
      toBuy.push({
        key: `auto:${a.norm}|${a.unit}`, name: a.name, qty: buy.qty, unit: buy.unit, forRecipes: [...a.forBuy], manual: false,
        detail: sentences.length ? sentences.join(' ') : undefined,
      });
    } else {
      const have = fromBase(haveBase, a.unit);
      covered.push({
        name: a.name,
        have: hasPlenty && haveBase <= EPS ? 'in your pantry' : `${formatQtyUnit(have.qty, have.unit)} in stock`,
        forRecipes: [...a.forAll],
      });
    }
  }

  for (const m of manual) {
    toBuy.push({ key: `manual:${m.id}`, name: m.name, qty: m.qty, unit: m.unit, forRecipes: [], manual: true, manualId: m.id });
  }

  toBuy.sort((x, y) => x.name.localeCompare(y.name));
  covered.sort((x, y) => x.name.localeCompare(y.name));
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

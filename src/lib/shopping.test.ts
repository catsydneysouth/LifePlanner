import { describe, expect, it } from 'vitest';
import { buildShopping, namesMatch, recipeCoverage, suggestUseItUp } from './shopping';
import { parseIngredientLine, normName } from './units';
import type { PantryItem, Plan, Recipe } from '../types';

const NOW = '2026-11-06';
const recipe = (id: string, name: string, lines: string[]): Recipe => ({
  id, name, servings: 2, time: '', tags: [], method: '',
  ingredients: lines.map((l) => parseIngredientLine(l)!),
});
const pantryItem = (name: string, qty: number | null, unit: string, expiry = ''): PantryItem => ({
  id: name + unit, name, qty, unit, location: 'cupboard', expiry,
});

describe('parseIngredientLine', () => {
  it('handles attached and spaced units, counts, fractions and bare names', () => {
    expect(parseIngredientLine('400g chopped tomatoes')).toEqual({ name: 'chopped tomatoes', qty: 400, unit: 'g' });
    expect(parseIngredientLine('2 tins chopped tomatoes')).toEqual({ name: 'chopped tomatoes', qty: 2, unit: 'tin' });
    expect(parseIngredientLine('3 eggs')).toEqual({ name: 'eggs', qty: 3, unit: '' });
    expect(parseIngredientLine('2 large onions')).toEqual({ name: 'large onions', qty: 2, unit: '' });
    expect(parseIngredientLine('1/2 tsp salt')).toEqual({ name: 'salt', qty: 0.5, unit: 'tsp' });
    expect(parseIngredientLine('1 1/2 kg potatoes')).toEqual({ name: 'potatoes', qty: 1.5, unit: 'kg' });
    expect(parseIngredientLine('olive oil')).toEqual({ name: 'olive oil', qty: null, unit: '' });
    expect(parseIngredientLine('   ')).toBeNull();
  });
});

describe('name matching', () => {
  it('treats plurals as the same and keeps different foods apart', () => {
    expect(normName('Tomatoes')).toBe('tomato');
    expect(normName('Hummus')).toBe('hummus');
    expect(namesMatch('tomatoes', 'tomato')).toBe(true);
    expect(namesMatch('tomato', 'chopped tomatoes')).toBe(true);
    expect(namesMatch('cherry tomatoes', 'chopped tomatoes')).toBe(false);
    expect(namesMatch('red onion', 'onion')).toBe(true);
    expect(namesMatch('butter', 'peanut butter')).toBe(true); // known limitation, documented in README
  });
});

describe('buildShopping', () => {
  const pasta = recipe('r1', 'Pasta', ['300g spaghetti', '2 tins chopped tomatoes', '2 garlic cloves', 'olive oil']);
  const curry = recipe('r2', 'Curry', ['1 tin chopped tomatoes', '500g chicken thighs', 'olive oil', '1 onion']);
  const plan: Plan = {
    '2026-11-07': { dinner: [{ id: 'a', kind: 'recipe', recipeId: 'r1' }] },
    '2026-11-08': { dinner: [{ id: 'b', kind: 'recipe', recipeId: 'r2' }, { id: 'c', kind: 'text', text: 'Takeaway' }] },
    '2026-11-01': { dinner: [{ id: 'z', kind: 'recipe', recipeId: 'r2' }] }, // outside range
  };

  it('adds up needs across recipes and records which recipes need each item', () => {
    const res = buildShopping({ plan, recipes: [pasta, curry], pantry: [], manual: [], from: NOW, to: '2026-11-12', now: NOW });
    const tomatoes = res.toBuy.find((i) => i.name === 'chopped tomatoes')!;
    expect(tomatoes.qty).toBe(3);
    expect(tomatoes.unit).toBe('tin');
    expect(tomatoes.forRecipes.sort()).toEqual(['Curry', 'Pasta']);
    expect(res.mealCount).toBe(2);
    const oil = res.toBuy.find((i) => i.name === 'olive oil')!;
    expect(oil.forRecipes.sort()).toEqual(['Curry', 'Pasta']);
  });

  it('subtracts the pantry, converts units, and ignores expired stock', () => {
    const pantry = [
      pantryItem('Spaghetti', 0.5, 'kg'),              // covers 300g
      pantryItem('Chopped tomatoes', 1, 'tin'),         // need 3, have 1 -> buy 2
      pantryItem('Chicken thighs', 600, 'g', '2026-11-05'), // expired -> must buy
      pantryItem('Olive oil', null, ''),                // unknown amount -> covered
    ];
    const res = buildShopping({ plan, recipes: [pasta, curry], pantry, manual: [], from: NOW, to: '2026-11-12', now: NOW });
    const names = res.toBuy.map((i) => i.name);
    expect(names).not.toContain('300g spaghetti');
    expect(names).not.toContain('spaghetti');
    expect(names).not.toContain('olive oil');
    const tomatoes = res.toBuy.find((i) => i.name === 'chopped tomatoes')!;
    expect(tomatoes.qty).toBe(2);
    expect(tomatoes.note).toBe('You have 1 tin');
    const chicken = res.toBuy.find((i) => i.name === 'chicken thighs')!;
    expect(chicken.qty).toBe(500);
    expect(chicken.unit).toBe('g');
    expect(res.covered.map((c) => c.name)).toEqual(expect.arrayContaining(['spaghetti', 'olive oil']));
  });

  it('flags stock in a different unit instead of silently counting it', () => {
    const res = buildShopping({ plan, recipes: [pasta, curry], pantry: [pantryItem('Onion', 400, 'g')], manual: [], from: NOW, to: '2026-11-12', now: NOW });
    const onion = res.toBuy.find((i) => i.name === 'onion')!;
    expect(onion.note).toContain('different units');
  });

  it('keeps manual items', () => {
    const res = buildShopping({ plan: {}, recipes: [], pantry: [], manual: [{ id: 'm1', name: 'Washing-up liquid', qty: null, unit: '' }], from: NOW, to: NOW, now: NOW });
    expect(res.toBuy).toHaveLength(1);
    expect(res.toBuy[0].manual).toBe(true);
  });
});

describe('coverage and use-it-up', () => {
  const stirfry = recipe('r3', 'Stir fry', ['1 pepper', '200g noodles', 'soy sauce']);
  it('reports ingredient coverage', () => {
    const cov = recipeCoverage(stirfry, [pantryItem('Peppers', 2, '')], NOW);
    expect(cov).toEqual({ have: 1, total: 3, missing: ['noodles', 'soy sauce'] });
  });
  it('suggests recipes that use food expiring soon, not already expired', () => {
    const pantry = [pantryItem('Peppers', 2, '', '2026-11-07'), pantryItem('Soy sauce', null, '', '2026-11-01')];
    const s = suggestUseItUp([stirfry], pantry, NOW);
    expect(s).toHaveLength(1);
    expect(s[0].uses).toEqual(['Peppers']);
  });
});

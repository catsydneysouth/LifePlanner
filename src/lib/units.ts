import type { Ingredient } from '../types';

/** Units we recognise when parsing "400 g chopped tomatoes". Plural/aliases map to a canonical form. */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tin: 'tin', tins: 'tin', can: 'tin', cans: 'tin',
  pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
  clove: 'clove', cloves: 'clove',
  bunch: 'bunch', bunches: 'bunch',
  slice: 'slice', slices: 'slice',
  pinch: 'pinch', pinches: 'pinch',
  jar: 'jar', jars: 'jar',
  bag: 'bag', bags: 'bag',
  bottle: 'bottle', bottles: 'bottle',
  pot: 'pot', pots: 'pot',
};

export function canonicalUnit(raw: string): string {
  const u = raw.trim().toLowerCase().replace(/\.$/, '');
  if (u === '' || u === 'x' || u === 'piece' || u === 'pieces' || u === 'pc' || u === 'pcs') return '';
  return UNIT_ALIASES[u] ?? u;
}

function parseQty(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  // "1 1/2", "1/2", "1.5", "1,5"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a free-text line like "400g chopped tomatoes", "2 tins tomatoes", "3 eggs",
 * "1/2 tsp salt" or "olive oil" into an Ingredient. Never throws; returns null for blank lines.
 */
export function parseIngredientLine(line: string): Ingredient | null {
  const text = line.trim().replace(/^[-•*]\s*/, '');
  if (!text) return null;
  const m = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*([a-zA-Z]+\.?)?\s*(.*)$/);
  if (!m) return { name: text, qty: null, unit: '' };
  const qty = parseQty(m[1]);
  const maybeUnit = m[2] ?? '';
  const rest = m[3] ?? '';
  const unitKey = maybeUnit.toLowerCase().replace(/\.$/, '');
  if (maybeUnit && UNIT_ALIASES[unitKey] !== undefined) {
    const name = rest.replace(/^of\s+/i, '').trim();
    return { name: name || maybeUnit, qty, unit: canonicalUnit(maybeUnit) };
  }
  // No known unit: the "unit" word was really part of the name ("3 eggs", "2 large onions")
  const name = `${maybeUnit} ${rest}`.trim();
  return { name: name || text, qty, unit: '' };
}

export function parseIngredientBlock(block: string): Ingredient[] {
  return block
    .split('\n')
    .map(parseIngredientLine)
    .filter((x): x is Ingredient => x !== null);
}

export function formatIngredient(i: { name: string; qty: number | null; unit: string }): string {
  return `${formatQtyUnit(i.qty, i.unit)} ${i.name}`.trim();
}

export function formatQty(q: number): string {
  const rounded = Math.round(q * 100) / 100;
  return String(rounded);
}

export function formatQtyUnit(qty: number | null, unit: string): string {
  if (qty === null) return '';
  const n = formatQty(qty);
  if (!unit) return n;
  const noSpace = unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l';
  return noSpace ? `${n}${unit}` : `${n} ${pluralUnit(unit, qty)}`;
}

function pluralUnit(unit: string, qty: number): string {
  if (qty === 1) return unit;
  if (unit === 'tsp' || unit === 'tbsp' || unit === 'pinch') return unit === 'pinch' ? 'pinches' : unit;
  if (unit === 'bunch') return 'bunches';
  return `${unit}s`;
}

/** Normalise a food name so "Tomatoes", "tomato " and "chopped tomatoes" can be compared. */
export function normName(raw: string): string {
  let s = raw.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const words = s.split(' ');
  const last = words[words.length - 1];
  words[words.length - 1] = singular(last);
  s = words.join(' ');
  return s;
}

function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('oes')) return w.slice(0, -2);
  if (w.endsWith('ss') || w.endsWith('us') || w.endsWith('is')) return w;
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

export interface BaseQty {
  qty: number;
  unit: string;
}

/** Convert to a base unit so g/kg and ml/l can be added and subtracted. (tsp/tbsp stay as written: nobody shops in them.) */
export function toBase(qty: number, unit: string): BaseQty {
  switch (unit) {
    case 'kg': return { qty: qty * 1000, unit: 'g' };
    case 'l': return { qty: qty * 1000, unit: 'ml' };
    default: return { qty, unit };
  }
}

/** Show a base quantity in a friendly unit (1500 g -> 1.5kg). */
export function fromBase(qty: number, unit: string): BaseQty {
  if (unit === 'g' && qty >= 1000) return { qty: qty / 1000, unit: 'kg' };
  if (unit === 'ml' && qty >= 1000) return { qty: qty / 1000, unit: 'l' };
  return { qty, unit };
}

export function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

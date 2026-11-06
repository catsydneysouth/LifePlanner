import type { AppState, CalEvent, Recipe, PantryItem, Plan, Task } from '../types';
import { addDays, startOfWeek, today } from './dates';
import { parseIngredientBlock } from './units';

let n = 0;
const id = (p: string) => `${p}${++n}`;

function recipe(name: string, servings: number, time: string, tags: string[], ingredients: string, method: string): Recipe {
  return { id: id('rec'), name, servings, time, tags, ingredients: parseIngredientBlock(ingredients), method };
}

export function makeSampleState(): AppState {
  const now = today();
  const mon = startOfWeek(now);
  const d = (offset: number) => addDays(now, offset);

  const recipes: Recipe[] = [
    recipe('Chicken & Chickpea Curry', 4, '40 min', ['dinner', 'batch'],
      `500g chicken thighs\n1 onion\n2 garlic cloves\n1 tin chopped tomatoes\n1 tin chickpeas\n200ml coconut milk\n2 tbsp curry paste\nbasmati rice`,
      'Brown the chicken, soften the onion and garlic, stir in the paste, then add tomatoes, chickpeas and coconut milk. Simmer for 25 minutes. Serve with rice.'),
    recipe('Spaghetti With Tomato & Basil', 2, '20 min', ['dinner', 'veggie', 'quick'],
      `200g spaghetti\n1 tin chopped tomatoes\n2 garlic cloves\n1 bunch basil\nolive oil\nparmesan`,
      'Cook the spaghetti. Fry the garlic gently in oil, add tomatoes and simmer for 10 minutes. Toss together with torn basil and parmesan.'),
    recipe('Veg-Loaded Omelette', 1, '10 min', ['breakfast', 'lunch', 'quick'],
      `3 eggs\n1 pepper\n50g spinach\n30g cheddar\nbutter`,
      'Soften the pepper in butter, add spinach until it wilts, pour in beaten eggs and cook gently. Fold with the cheese.'),
    recipe('Overnight Oats', 1, '5 min + overnight', ['breakfast', 'prep-ahead'],
      `50g oats\n150ml milk\n1 tbsp honey\n1 banana\nGreek yoghurt`,
      'Stir oats, milk and honey in a jar. Chill overnight. Top with sliced banana and a spoonful of yoghurt.'),
    recipe('Salmon, Potatoes & Greens', 2, '30 min', ['dinner'],
      `2 salmon fillets\n500g new potatoes\n200g broccoli\n1 lemon\nolive oil`,
      'Roast the potatoes for 20 minutes, add the salmon for the last 12. Steam the broccoli. Finish with lemon.'),
    recipe('Lentil & Veg Soup', 4, '35 min', ['lunch', 'veggie', 'batch'],
      `200g red lentils\n1 onion\n2 carrots\n1 litre vegetable stock\n1 tsp cumin\n1 tin chopped tomatoes`,
      'Soften the onion and carrots, add cumin, lentils, tomatoes and stock. Simmer for 25 minutes and blend half.'),
  ];
  const byName = (s: string) => {
    const r = recipes.find((x) => x.name.startsWith(s));
    if (!r) throw new Error(`Sample recipe not found: ${s}`);
    return r.id;
  };

  const item = (name: string, qty: number | null, unit: string, location: PantryItem['location'], expiry: string): PantryItem => ({
    id: id('pan'), name, qty, unit, location, expiry,
  });

  const pantry: PantryItem[] = [
    item('Chicken thighs', 600, 'g', 'fridge', d(1)),
    item('Spinach', 150, 'g', 'fridge', d(0)),
    item('Eggs', 6, '', 'fridge', d(9)),
    item('Milk', 1.5, 'l', 'fridge', d(2)),
    item('Greek yoghurt', 1, 'pot', 'fridge', d(4)),
    item('Cheddar', 200, 'g', 'fridge', d(18)),
    item('Peppers', 2, '', 'fridge', d(3)),
    item('Butter', 250, 'g', 'fridge', d(30)),
    item('Salmon fillets', 2, '', 'freezer', d(60)),
    item('Peas', 800, 'g', 'freezer', d(120)),
    item('Spaghetti', 500, 'g', 'cupboard', d(300)),
    item('Basmati rice', 1, 'kg', 'cupboard', d(240)),
    item('Chopped tomatoes', 2, 'tin', 'cupboard', d(400)),
    item('Chickpeas', 1, 'tin', 'cupboard', d(380)),
    item('Oats', 500, 'g', 'cupboard', d(200)),
    item('Red lentils', 300, 'g', 'cupboard', d(250)),
    item('Olive oil', null, '', 'cupboard', ''),
    item('Honey', null, '', 'cupboard', ''),
    item('Onions', 3, '', 'cupboard', d(10)),
    item('Yoghurt (old)', 1, 'pot', 'fridge', d(-2)),
  ];

  const plan: Plan = {};
  const put = (date: string, slot: 'breakfast' | 'lunch' | 'dinner', e: { kind: 'text'; text: string } | { kind: 'recipe'; recipeId: string }) => {
    plan[date] ??= {};
    (plan[date][slot] ??= []).push({ id: id('m'), ...e } as never);
  };
  put(mon, 'breakfast', { kind: 'recipe', recipeId: byName('Overnight') });
  put(addDays(mon, 1), 'breakfast', { kind: 'recipe', recipeId: byName('Overnight') });
  put(d(0), 'breakfast', { kind: 'recipe', recipeId: byName('Veg-Loaded') });
  put(d(0), 'lunch', { kind: 'text', text: 'Leftover soup from the freezer' });
  put(d(0), 'dinner', { kind: 'recipe', recipeId: byName('Chicken') });
  put(d(1), 'lunch', { kind: 'recipe', recipeId: byName('Lentil') });
  put(d(1), 'dinner', { kind: 'recipe', recipeId: byName('Spaghetti') });
  put(d(2), 'dinner', { kind: 'recipe', recipeId: byName('Salmon') });
  put(d(3), 'dinner', { kind: 'text', text: 'Out with friends' });
  put(d(4), 'dinner', { kind: 'recipe', recipeId: byName('Chicken') });
  put(d(4), 'lunch', { kind: 'text', text: 'Cheese & pickle sandwich' });

  const task = (title: string, due: string, project = '', priority = false): Task => ({ id: id('task'), title, done: false, due, project, priority, notes: '' });
  const tasks: Task[] = [
    task('Book dentist appointment', d(-2), 'Home', true),
    task('Reply to venue about the Q1 offsite', d(0), 'Work', true),
    task('Send expenses to finance', d(0), 'Work'),
    task('Order a birthday present', d(2), 'Personal'),
    task('Renew car insurance', d(9), 'Home'),
    task('Plan next month’s volunteering rota', '', 'Volunteering'),
  ];
  const event = (title: string, date: string, start: string, end: string, notes = ''): CalEvent => ({ id: id('ev'), title, date, allDay: !start, start, end, notes });
  const events: CalEvent[] = [
    event('Team Stand-Up', d(0), '09:30', '10:00'),
    event('Long Run', d(1), '07:30', '09:00'),
    event('Volunteering', addDays(startOfWeek(now), 5), '10:00', '14:00'),
    event('Dinner With Friends', d(3), '19:30', '22:00'),
    event('Bank Holiday', d(12), '', ''),
  ];

  return {
    version: 1,
    recipes,
    pantry,
    plan,
    manual: [{ id: id('man'), name: 'Dishwasher tablets', qty: null, unit: '' }],
    tasks,
    events,
    isSample: true,
  };
}

export function emptyState(): AppState {
  return { version: 1, recipes: [], pantry: [], plan: {}, manual: [], tasks: [], events: [], isSample: false };
}

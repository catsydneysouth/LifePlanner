# Life Planner

Your own planner. The first section built is **Food**: meal plan, pantry (with expiry dates), recipes and a smart shopping list. More sections (Today, Goals, Habits…) will sit alongside it in the menu.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # shopping-list logic tests
npm run build      # production build in dist/
```

## What it does

- **Meal plan**: each meal is free text, or one or more saved recipes. A dot shows whether you already have everything for a recipe.
- **Pantry**: quantity, unit, where it lives (fridge, freezer, cupboard) and a use-by date. Sorted by what to eat first. A "Use it up" panel flags anything expiring in 2 days or already expired and suggests recipes that would use it. "Add many" takes a pasted list.
- **Recipes**: paste ingredients one per line ("400g chopped tomatoes", "2 tins kidney beans", "1/2 tsp cumin"). Each recipe shows how much of it you already have.
- **Shopping list**: worked out from the recipes planned over the next 3, 7 or 14 days, minus what is in date in your pantry. Every line says which recipes it is for ("for Chicken curry, Lentil soup"). Tick things off, then "Put away in pantry" to log where they live and when they expire.

## Where the data lives

Everything is saved in the browser on the device you use (localStorage). It is **not** synced between phone and laptop yet.
Use **Download backup / Restore backup** (bottom of the sidebar) to move data between devices or keep a copy.
Clearing your browser data deletes it, so download a backup now and then.

All reads and writes go through one small interface in `src/lib/storage.ts`.
To add sync, write a second implementation (Supabase, Firebase, Base44, your own API…) and pass it to `<StoreProvider storage={...}>` in `src/main.tsx`. No screen needs to change.

## Put it online

It is a static site. Either:

- **GitHub Pages / Netlify / Vercel / Cloudflare Pages**: point at the repo, build command `npm run build`, output folder `dist`. `base` is `./` so it works from any sub-path.
- Then open the URL on your phone and use "Add to Home Screen".

## Known limits (deliberate for v0.1)

- Ingredient matching is by name. "Tomatoes" matches "tomato" and "chopped tomatoes", but "butter" also matches "peanut butter". Keep names consistent.
- Quantities only subtract when units are compatible (g/kg, ml/l, or the same word such as "tin"). Otherwise the list says "You have X (different units, so not counted)" rather than guessing.
- A planned recipe counts as one batch as written. There is no servings scaling yet.
- Teaspoons and tablespoons are kept as written, so "1 tsp cumin" and "1 tbsp cumin" would appear as two lines.
- Dates use the device's local day. No notifications or reminders yet.

## Layout

```
src/lib/shopping.ts   needs - pantry engine, coverage, use-it-up   (tested)
src/lib/units.ts      ingredient parsing, unit conversion, name matching
src/lib/storage.ts    storage interface + localStorage + backup
src/store.tsx         app state and actions
src/pages/            Week, Pantry, Recipes, Shopping
```

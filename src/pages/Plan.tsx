import { WeekPlanner } from './Week';
import { RecipesPanel, RecipeModals } from './Recipes';

/** Meal Plan page: the week on the left, a short recipes list on the right to drag from. */
export function PlanPage({ arg }: { arg: string | null }) {
  const rest = arg && arg.startsWith('recipe/') ? arg.slice('recipe/'.length) : null;
  return (
    <>
      <div className="plan-layout">
        <div className="plan-main"><WeekPlanner /></div>
        <aside className="plan-side"><RecipesPanel /></aside>
      </div>
      <RecipeModals rest={rest} basePath="#/plan/recipe" closePath="#/plan" />
    </>
  );
}

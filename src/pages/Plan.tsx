import { WeekPlanner } from './Week';
import { RecipesPanel, RecipeModals } from './Recipes';

/** Meal Plan page: the week on the left, your recipes on the right, so nothing is a page away. */
export function PlanPage({ arg }: { arg: string | null }) {
  return (
    <>
      <div className="plan-layout">
        <div className="plan-main"><WeekPlanner /></div>
        <aside className="plan-side"><RecipesPanel /></aside>
      </div>
      <RecipeModals arg={arg} />
    </>
  );
}

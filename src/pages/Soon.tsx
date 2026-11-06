import { EmptyState } from '../components/ui';

export const SOON = [
  { page: 'projects', label: 'Projects & Goals', blurb: 'Track projects and goals, break them into steps and see progress over time.' },
  { page: 'habits', label: 'Habits & Fitness', blurb: 'Daily habits, running and training, all in one place.' },
  { page: 'home', label: 'Home', blurb: 'Cleaning routines, maintenance, household lists and anything to do with the house.' },
  { page: 'travel', label: 'Travel', blurb: 'Trips, itineraries, bookings and packing lists.' },
  { page: 'money', label: 'Money', blurb: 'Budgets, bills and savings goals.' },
] as const;

export function SoonPage({ page }: { page: string }) {
  const s = SOON.find((x) => x.page === page);
  if (!s) return null;
  return (
    <>
      <div className="page-head"><div><h1>{s.label}</h1><div className="sub">Coming soon.</div></div></div>
      <div className="card"><EmptyState title="This Section Is Next In Line">{s.blurb}</EmptyState></div>
    </>
  );
}
